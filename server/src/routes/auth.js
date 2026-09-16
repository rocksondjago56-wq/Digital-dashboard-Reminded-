import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.js';
import { ensureSupabaseProfile, getVerifiedSupabaseUser, updateSupabaseProfileRole } from '../services/supabase-auth.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * Generate a JWT token for a user.
 */
function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'ttu-dashboard-jwt-fallback-secret-2026';
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    secret,
    { expiresIn: '7d' }
  );
}

/**
 * Format user object for API response (strips sensitive data).
 */
function formatUser(user, completedDeadlines = []) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    department: user.department,
    year: user.year,
    certificate: user.certificate,
    studentId: user.studentId,
    staffId: user.staffId,
    phone: user.phone,
    indexNumber: user.studentId,
    designation: user.designation,
    courses: user.courses || [],
    profilePic: user.profilePictureUrl,
    isVerified: Boolean(user.isVerified),
    completedDeadlines
  };
}

async function validateAdminAccessCode(accessCode) {
  const code = String(accessCode || '').trim();
  if (!code) return false;

  const masterCode = (process.env.ADMIN_ACCESS_CODE || 'TTU-ADMIN-2026').trim();
  if (code.toUpperCase() === masterCode.toUpperCase()) return true;

  try {
    const activeCodes = await prisma.registrationCode.findMany({
      where: {
        role: 'admin',
        usedAt: null,
        revokedAt: null,
        expiresAt: { gt: new Date() }
      }
    });

    for (const item of activeCodes) {
      const matches = await bcrypt.compare(code, item.codeHash);
      if (matches) {
        await prisma.registrationCode.update({
          where: { id: item.id },
          data: { usedAt: new Date() }
        });
        return true;
      }
    }
  } catch (err) {
    console.warn('[auth] registrationCode check warning:', err.message);
  }

  return false;
}

async function exchangePasswordAccount(accessToken, rawProfile = {}) {
  const profile = (rawProfile && typeof rawProfile === 'object') ? rawProfile : {};
  const rawAuthUser = await getVerifiedSupabaseUser(accessToken);
  const authUser = (rawAuthUser?.user || rawAuthUser);
  if (!authUser || !authUser.email) throw new Error('A verified Supabase email/password session is required.');
  const email = authUser.email.trim().toLowerCase();
  if (profile.email?.trim() && profile.email.trim().toLowerCase() !== email) {
    throw new Error('Use the same email address used during registration.');
  }

  // Determine if this is a registration attempt (role explicitly selected in the form)
  // vs a plain sign-in (no profile submitted, so profile.role is undefined).
  const profileRole = ['student', 'lecturer', 'admin'].includes(profile.role) ? profile.role : null;

  // ─── FAST SIGN-IN PATH ────────────────────────────────────────────────────
  // For returning users signing in (not registering), read the role directly
  // from Prisma. Never let the Supabase profile overwrite it — Supabase may
  // still have a stale 'student' role if SUPABASE_SERVICE_ROLE_KEY was missing.
  if (!profileRole && process.env.DATABASE_URL) {
    try {
      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        const completedDeadlines = (['student', 'student_head'].includes(existingUser.role))
          ? (await prisma.deadlineCompletion.findMany({ where: { studentId: existingUser.id }, select: { deadlineId: true } }).catch(() => [])).map(item => item.deadlineId)
          : [];
        console.info('[auth] Fast sign-in (existing Prisma user)', { userId: existingUser.id, email, role: existingUser.role });
        return { token: generateToken(existingUser), user: formatUser(existingUser, completedDeadlines) };
      }
    } catch (lookupErr) {
      console.warn('[auth] Fast sign-in lookup failed, falling through to registration path:', lookupErr.message);
    }
  }

  // ─── REGISTRATION PATH ───────────────────────────────────────────────────
  // New user, or user explicitly re-registering with a new role.
  if (!process.env.DATABASE_URL) {
    throw new Error('Database connection is not configured on Render (missing DATABASE_URL). Please configure DATABASE_URL in Render environment settings.');
  }

  let supabaseProfile = await ensureSupabaseProfile(accessToken, authUser);
  const metadata = authUser.user_metadata || {};
  const metaRole = ['student', 'lecturer', 'admin'].includes(metadata.requested_role) ? metadata.requested_role : null;

  // Apply the role from the registration form (overrides any stale Supabase value)
  if (profileRole && profileRole !== supabaseProfile.role) {
    if (profileRole === 'admin') {
      const isValid = await validateAdminAccessCode(profile.accessCode);
      if (!isValid) throw new Error('A valid Administrator Access Code is required to register an Administrator account.');
    }
    supabaseProfile = await updateSupabaseProfileRole(supabaseProfile.id, profileRole);
    supabaseProfile.role = profileRole;
  } else if (!supabaseProfile.role && metaRole) {
    supabaseProfile = await updateSupabaseProfileRole(supabaseProfile.id, metaRole);
    supabaseProfile.role = metaRole;
  }

  const role = profileRole || supabaseProfile.role || 'student';
  const name = profile.fullName?.trim() || metadata.name || metadata.full_name || email.split('@')[0];
  const courses = Array.isArray(profile.courses) ? profile.courses.filter(Boolean) : (metadata.requested_courses || []);
  const registrationFields = {
    department: profile.department?.trim() || metadata.department || 'Graphic Design',
    year: role === 'student' ? profile.year || metadata.year || 'Year 1' : null,
    certificate: role === 'student' ? profile.certificate || metadata.certificate || 'BTech' : null,
    studentId: role === 'student' ? profile.indexNumber?.trim() || metadata.student_id || null : null,
    staffId: role === 'student' ? null : (profile.lecturerId || profile.staffId || metadata.staff_id || null),
    phone: profile.phone?.trim() || metadata.phone || null,
    designation: role === 'admin' ? profile.position?.trim() || metadata.designation || 'Department Administrator' : null,
    courses: role === 'lecturer' ? courses : []
  };

  let user;
  try {
    user = await prisma.user.upsert({
      where: { email },
      update: { name, role, isVerified: true, ...registrationFields },
      create: {
        name,
        email,
        passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
        role,
        isVerified: true,
        ...registrationFields,
        studentId: role === 'student' ? registrationFields.studentId || null : null
      }
    });
  } catch (dbError) {
    console.error('[auth] Prisma user.upsert error during registration:', dbError);
    if (dbError.code === 'P2002') {
      const target = dbError.meta?.target || [];
      const fieldName = Array.isArray(target) ? target.join(', ') : 'field';
      throw new Error(`An existing account already uses this ${fieldName}.`);
    }
    throw dbError;
  }

  const completedDeadlines = (role === 'student' || role === 'student_head')
    ? (await prisma.deadlineCompletion.findMany({ where: { studentId: user.id }, select: { deadlineId: true } }).catch(() => [])).map(item => item.deadlineId)
    : [];
  console.info('[auth] Registration/first-sign-in role decision', { userId: user.id, email, role, dashboard: `${role}-dashboard` });
  return { token: generateToken(user), user: formatUser(user, completedDeadlines) };
}

router.post('/password-signin', async (req, res) => {
  try {
    const result = await exchangePasswordAccount(req.body.accessToken, req.body.profile || {});
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Email/password portal sign-in error:', error);
    res.status(400).json({ error: error.message || 'Could not sign in to the portal.' });
  }
});

/**
 * POST /api/auth/google-signin
 * Exchange a verified Supabase Google session for a TTU portal session.
 */
router.post('/google-signin', async (req, res) => {
  try {
    const { accessToken, profile: rawProfile } = req.body;
    const profile = (rawProfile && typeof rawProfile === 'object') ? rawProfile : {};

    if (!process.env.DATABASE_URL) {
      console.error('[auth] DATABASE_URL is not set on Render.');
      return res.status(503).json({
        error: 'Database connection is not configured on Render (missing DATABASE_URL). Please configure DATABASE_URL in Render environment settings.'
      });
    }

    let rawGoogleUser;
    try {
      rawGoogleUser = await getVerifiedSupabaseUser(accessToken);
    } catch (authErr) {
      return res.status(401).json({
        error: authErr.message || 'The Supabase authentication session is invalid or has expired. Please sign in again.'
      });
    }

    const googleUser = (rawGoogleUser?.user || rawGoogleUser);
    const hasGoogleProvider = googleUser?.app_metadata?.providers?.includes('google');
    if (!hasGoogleProvider || !googleUser?.email) {
      return res.status(403).json({ error: 'Continue with Google is required to access the portal.' });
    }

    const email = googleUser.email.trim().toLowerCase();
    if (profile.email?.trim() && profile.email.trim().toLowerCase() !== email) {
      return res.status(400).json({ error: 'Use the same Google email address entered during registration.' });
    }
    let supabaseProfile = await ensureSupabaseProfile(accessToken, googleUser);
    const metadata = googleUser.user_metadata || {};
    const name = profile.fullName?.trim() || metadata.full_name || metadata.name || email.split('@')[0];
    const profilePictureUrl = metadata.avatar_url || metadata.picture || null;

    const profileRole = ['student', 'lecturer', 'admin'].includes(profile.role) ? profile.role : null;

    // ─── FAST SIGN-IN PATH (Google returning user) ───────────────────────────
    // Read role from Prisma directly. Supabase profile cannot overwrite it.
    if (!profileRole) {
      try {
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
          // Update name/photo in case they changed, but preserve the stored role
          const updatedUser = await prisma.user.update({
            where: { email },
            data: {
              name,
              profilePictureUrl: profilePictureUrl || existingUser.profilePictureUrl || undefined,
              isVerified: true
            }
          });
          const completedDeadlines = (['student', 'student_head'].includes(updatedUser.role))
            ? (await prisma.deadlineCompletion.findMany({ where: { studentId: updatedUser.id }, select: { deadlineId: true } }).catch(() => [])).map(item => item.deadlineId)
            : [];
          console.info('[auth] Fast Google sign-in (existing Prisma user)', { userId: updatedUser.id, email, role: updatedUser.role });
          return res.json({ success: true, token: generateToken(updatedUser), user: formatUser(updatedUser, completedDeadlines) });
        }
      } catch (lookupErr) {
        console.warn('[auth] Fast Google sign-in lookup failed, falling through:', lookupErr.message);
      }
    }

    // ─── REGISTRATION PATH (new Google user or re-registering) ───────────────
    const metaRole = ['student', 'lecturer', 'admin'].includes(metadata.requested_role) ? metadata.requested_role : null;

    if (profileRole && profileRole !== supabaseProfile.role) {
      if (profileRole === 'admin') {
        const isValid = await validateAdminAccessCode(profile.accessCode);
        if (!isValid) {
          return res.status(403).json({ error: 'A valid Administrator Access Code is required to register an Administrator account.' });
        }
      }
      supabaseProfile = await updateSupabaseProfileRole(supabaseProfile.id, profileRole);
      supabaseProfile.role = profileRole;
    } else if (!supabaseProfile.role && metaRole) {
      if (metaRole === 'admin') {
        const isValid = await validateAdminAccessCode(profile.accessCode);
        if (!isValid) {
          return res.status(403).json({ error: 'A valid Administrator Access Code is required to register an Administrator account.' });
        }
      }
      supabaseProfile = await updateSupabaseProfileRole(supabaseProfile.id, metaRole);
      supabaseProfile.role = metaRole;
    }

    const role = profileRole || supabaseProfile.role || 'student';

    const courses = Array.isArray(profile.courses) ? profile.courses.filter(Boolean) : (metadata.requested_courses || []);
    const registrationFields = {
      department: profile.department?.trim() || metadata.department || 'Graphic Design',
      year: role === 'student' ? profile.year || metadata.year || 'Year 1' : null,
      certificate: role === 'student' ? profile.certificate || metadata.certificate || 'BTech' : null,
      studentId: role === 'student' ? profile.indexNumber?.trim() || metadata.student_id || null : null,
      staffId: role === 'student' ? null : (profile.lecturerId || profile.staffId || metadata.staff_id || null),
      phone: profile.phone?.trim() || metadata.phone || null,
      designation: role === 'admin' ? profile.position?.trim() || metadata.designation || 'Department Administrator' : null,
      courses: role === 'lecturer' ? courses : []
    };

    let user;
    try {
      user = await prisma.user.upsert({
        where: { email },
        update: {
          name,
          role,
          profilePictureUrl: profilePictureUrl || undefined,
          isVerified: true,
          ...registrationFields
        },
        create: {
          name,
          email,
          passwordHash: await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12),
          role,
          ...registrationFields,
          studentId: role === 'student' ? registrationFields.studentId || `04${Math.floor(10000000 + Math.random() * 90000000)}` : null,
          profilePictureUrl,
          isVerified: true
        }
      });
    } catch (dbError) {
      console.error('[auth] Prisma user.upsert error during Google sign-in:', dbError);
      if (dbError.code === 'P2002') {
        const target = dbError.meta?.target || [];
        const fieldName = Array.isArray(target) ? target.join(', ') : 'field';
        return res.status(409).json({
          error: `An existing account already uses this ${fieldName}. Please check your details.`
        });
      }
      return res.status(500).json({
        error: dbError.message?.includes('DATABASE_URL')
          ? 'Database connection error: DATABASE_URL is missing or invalid on Render.'
          : (dbError.message || 'Database error occurred while saving your portal user.')
      });
    }

    const completedDeadlines = (user.role === 'student' || user.role === 'student_head')
      ? (await prisma.deadlineCompletion.findMany({ where: { studentId: user.id }, select: { deadlineId: true } }).catch(() => [])).map(item => item.deadlineId)
      : [];

    console.info('[auth] Google sign-in role decision', { userId: user.id, email, profileId: supabaseProfile.id, role: user.role, dashboard: `${user.role}-dashboard` });
    res.json({ success: true, token: generateToken(user), user: formatUser(user, completedDeadlines) });
  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ error: error.message || 'Google sign-in could not create your portal profile. Please try again.' });
  }
});

/**
 * POST /api/auth/login
 * Legacy local-password endpoint for existing records. New portal sign-in uses
 * Supabase email/password sessions through /password-signin.
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required.' });
    }

    const term = identifier.trim().toLowerCase();
    const cleanDigits = term.replace(/[^0-9]/g, '');

    // Search by email, name, studentId, staffId, or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: term },
          { name: { equals: term, mode: 'insensitive' } },
          { studentId: { equals: term, mode: 'insensitive' } },
          { staffId: { equals: term, mode: 'insensitive' } },
          { phone: { equals: term, mode: 'insensitive' } },
          ...(cleanDigits.length >= 7 ? [{ phone: { contains: cleanDigits } }] : [])
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Account not found. Use your email, mobile number, full name, index number, or staff ID.' });
    }

    // Verify password first
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    // Get completed deadlines for students
    let completedDeadlines = [];
    if (user.role === 'student' || user.role === 'student_head') {
      const completions = await prisma.deadlineCompletion.findMany({
        where: { studentId: user.id },
        select: { deadlineId: true }
      });
      completedDeadlines = completions.map(c => c.deadlineId);
    }

    const token = generateToken(user);

    res.json({
      success: true,
      token,
      user: formatUser(user, completedDeadlines)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

/**
 * GET /api/auth/me
 * Get current user from JWT token.
 */
router.get('/me', authenticate, async (req, res) => {
  try {
    let completedDeadlines = [];
    if (req.user.role === 'student' || req.user.role === 'student_head') {
      const completions = await prisma.deadlineCompletion.findMany({
        where: { studentId: req.user.id },
        select: { deadlineId: true }
      });
      completedDeadlines = completions.map(c => c.deadlineId);
    }

    res.json({ success: true, user: formatUser(req.user, completedDeadlines) });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user data.' });
  }
});

export default router;
