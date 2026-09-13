import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.js';
import { getVerifiedSupabaseUser } from '../services/supabase-auth.js';

const router = Router();
const prisma = new PrismaClient();

function matchesRegistrationCode(role, providedCode) {
  const expectedCode = role === 'lecturer'
    ? process.env.LECTURER_REGISTRATION_CODE
    : process.env.ADMIN_REGISTRATION_CODE;
  if (!expectedCode || !providedCode) return false;
  const expected = Buffer.from(expectedCode);
  const provided = Buffer.from(providedCode);
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}

/**
 * Generate a JWT token for a user.
 */
function generateToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
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

/**
 * POST /api/auth/google-signin
 * Exchange a verified Supabase Google session for a TTU portal session.
 */
router.post('/google-signin', async (req, res) => {
  try {
    const { accessToken, profile = {} } = req.body;
    const googleUser = await getVerifiedSupabaseUser(accessToken);
    const hasGoogleProvider = googleUser.app_metadata?.providers?.includes('google');
    if (!hasGoogleProvider || !googleUser.email) {
      return res.status(403).json({ error: 'Continue with Google is required to access the portal.' });
    }

    const email = googleUser.email.trim().toLowerCase();
    if (profile.email?.trim() && profile.email.trim().toLowerCase() !== email) {
      return res.status(400).json({ error: 'Use the same Google email address entered during registration.' });
    }
    const metadata = googleUser.user_metadata || {};
    const name = profile.fullName?.trim() || metadata.full_name || metadata.name || email.split('@')[0];
    const profilePictureUrl = metadata.avatar_url || metadata.picture || null;
    const identityNumber = profile.identityNumber?.trim();
    const userByEmail = await prisma.user.findUnique({ where: { email } });
    const userByIdentity = identityNumber
      ? await prisma.user.findUnique({ where: { staffId: identityNumber } })
      : null;
    if (identityNumber && (!userByIdentity || userByIdentity.email !== email)) {
      return res.status(403).json({ error: 'That Lecturer ID or Staff ID is not linked to this Google email.' });
    }
    const existingUser = userByEmail || userByIdentity;
    const requestedRole = ['student', 'lecturer', 'admin'].includes(profile.role) ? profile.role : null;
    const hasRoleCode = requestedRole && requestedRole !== 'student'
      ? matchesRegistrationCode(requestedRole, profile.accessCode)
      : false;
    const isApprovedProfile = requestedRole === 'student'
      || (existingUser && requestedRole === existingUser.role)
      || hasRoleCode;
    if (requestedRole && !isApprovedProfile) {
      return res.status(403).json({
        error: 'Enter the correct role registration code, or sign in with the Lecturer ID or Staff ID already linked to your Google email.'
      });
    }
    const role = existingUser?.role || requestedRole || 'student';
    const courses = Array.isArray(profile.courses) ? profile.courses.filter(Boolean) : [];

    // Privileged roles come from a department-provisioned record, never from
    // an unauthenticated registration form.
    const registrationFields = isApprovedProfile && requestedRole ? {
      department: profile.department?.trim() || 'Graphic Design',
      year: requestedRole === 'student' ? profile.year || 'Year 1' : null,
      certificate: requestedRole === 'student' ? profile.certificate || 'BTech' : null,
      studentId: requestedRole === 'student' ? profile.indexNumber?.trim() || null : null,
      staffId: requestedRole === 'student' ? null : (profile.lecturerId || profile.staffId || null),
      phone: profile.phone?.trim() || null,
      designation: requestedRole === 'admin' ? profile.position?.trim() || null : null,
      courses: requestedRole === 'lecturer' ? courses : []
    } : {};

    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name,
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

    const completedDeadlines = user.role === 'student' || user.role === 'student_head'
      ? (await prisma.deadlineCompletion.findMany({ where: { studentId: user.id }, select: { deadlineId: true } })).map(item => item.deadlineId)
      : [];

    res.json({ success: true, token: generateToken(user), user: formatUser(user, completedDeadlines) });
  } catch (error) {
    console.error('Google sign-in error:', error);
    res.status(500).json({ error: 'Google sign-in could not create your portal profile. Please try again.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate with email, name, studentId, staffId, or mobile phone + password.
 * Blocks unverified users until verification is completed.
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

    // Legacy password accounts must use their matching Google identity.
    if (!user.isVerified) {
      return res.status(403).json({
        error: 'This account now uses Google sign-in. Select Continue with Google to access the portal.'
      });
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
