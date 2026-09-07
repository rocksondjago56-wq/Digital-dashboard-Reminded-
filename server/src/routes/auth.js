import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.js';
import { sendVerificationEmail } from '../services/email.js';

const router = Router();
const prisma = new PrismaClient();

const getPhoneLookupTerms = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 7) return [];

  const terms = new Set([digits]);
  if (digits.startsWith('0') && digits.length === 10) terms.add(`233${digits.slice(1)}`);
  if (digits.startsWith('233') && digits.length === 12) terms.add(`0${digits.slice(3)}`);
  return [...terms];
};

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
    isVerified: user.isVerified,
    completedDeadlines
  };
}

/**
 * POST /api/auth/signup
 * Register a new user account.
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role = 'student', year, certificate, studentId, indexNumber, staffId, phone, designation, courses, verifyViaMobile } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existingEmail) {
      return res.status(409).json({ error: 'This email is already registered. Use Sign In instead.' });
    }

    // Check if phone already exists if provided
    const formattedPhone = phone ? phone.trim() : null;
    const phoneTerms = getPhoneLookupTerms(formattedPhone);
    if (formattedPhone) {
      const existingPhone = await prisma.user.findFirst({
        where: { OR: phoneTerms.map(value => ({ phone: { contains: value } })) }
      });
      if (existingPhone) {
        return res.status(409).json({ error: 'This mobile number is already registered to an account.' });
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    const isStaff = role === 'lecturer' || role === 'admin';
    const isVerified = !(isStaff && verifyViaMobile);

    let verificationCodeHash = null;
    let verificationExpiresAt = null;
    let devCode = null;

    if (!isVerified) {
      devCode = String(Math.floor(100000 + Math.random() * 900000));
      verificationCodeHash = await bcrypt.hash(devCode, 10);
      verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    }

    // Build user data
    const userData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role,
      department: 'Graphic Design',
      year: year || (role === 'student' || role === 'student_head' ? 'Year 1' : null),
      certificate: certificate || (role === 'student' || role === 'student_head' ? 'BTech' : null),
      studentId: studentId || indexNumber || (role === 'student' || role === 'student_head' ? `04${Math.floor(10000000 + Math.random() * 90000000)}` : null),
      staffId: staffId || (role === 'lecturer' ? `LEC-${Math.floor(1000 + Math.random() * 9000)}` : role === 'admin' ? `ADM-${Math.floor(1000 + Math.random() * 9000)}` : null),
      phone: formattedPhone,
      designation: designation || (role === 'admin' ? 'Department Administrator' : null),
      courses: Array.isArray(courses) ? courses : (typeof courses === 'string' ? courses.split(',').map(c => c.trim()).filter(Boolean) : role === 'lecturer' ? ['General Design'] : []),
      isVerified,
      verificationCodeHash,
      verificationExpiresAt
    };

    const user = await prisma.user.create({ data: userData });
    const token = generateToken(user);

    if (!isVerified && formattedPhone) {
      sendVerificationEmail({ to: user.email, name: user.name, code: devCode }).catch(() => {});
    }

    res.status(201).json({
      success: true,
      token,
      user: formatUser(user),
      requiresVerification: !isVerified,
      developmentCode: devCode,
      message: isVerified
        ? 'Account created successfully!'
        : `Staff account created! A 6-digit verification code was sent to ${user.email}. The registered mobile number can also be used to identify the account.`
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

const findIdentity = (identifier) => {
  const term = identifier.trim().toLowerCase();
  const phoneTerms = getPhoneLookupTerms(term);

  return prisma.user.findFirst({
    where: {
      OR: [
        { email: term },
        { studentId: { equals: term, mode: 'insensitive' } },
        { staffId: { equals: term, mode: 'insensitive' } },
        { phone: { equals: term, mode: 'insensitive' } },
        ...phoneTerms.map(value => ({ phone: { contains: value } }))
      ]
    }
  });
};

router.post('/request-verification', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ error: 'Enter your TTU email, mobile number, index number, or staff ID.' });

    const user = await findIdentity(identifier);
    if (!user) return res.status(404).json({ error: 'No account or preloaded identity was found for this detail.' });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const verificationCodeHash = await bcrypt.hash(code, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCodeHash, verificationExpiresAt: new Date(Date.now() + 15 * 60 * 1000) }
    });

    const delivery = await sendVerificationEmail({ to: user.email, name: user.name, code });
    const targetDesc = user.phone ? `TTU email (${user.email}). The registered mobile number (${user.phone}) can also be used to find this account` : `TTU email (${user.email})`;
    res.json({
      success: true,
      message: `A 6-digit verification code has been generated for your ${targetDesc}.`,
      developmentCode: delivery.developmentCode || code
    });
  } catch (error) {
    console.error('Request verification error:', error);
    res.status(500).json({ error: 'Could not send the verification code.' });
  }
});

router.post('/activate-account', async (req, res) => {
  try {
    const { identifier, code, password } = req.body;
    if (!identifier || !code || !password) return res.status(400).json({ error: 'Identifier, verification code, and password are required.' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const user = await findIdentity(identifier);
    if (!user || !user.verificationCodeHash || !user.verificationExpiresAt) {
      return res.status(400).json({ error: 'Request a new verification code before verifying your account or updating password.' });
    }
    if (user.verificationExpiresAt < new Date()) return res.status(400).json({ error: 'This verification code has expired. Request another code.' });
    if (!(await bcrypt.compare(code, user.verificationCodeHash))) return res.status(400).json({ error: 'The verification code is incorrect.' });

    const activated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(password, 12),
        isVerified: true,
        verificationCodeHash: null,
        verificationExpiresAt: null
      }
    });
    res.json({ success: true, message: `Account verified and password set successfully for ${activated.name}! You can now sign in.` });
  } catch (error) {
    console.error('Activate account error:', error);
    res.status(500).json({ error: 'Could not activate or verify your account.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate with email, name, studentId, staffId, or mobile phone + password.
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

    if (!user.isVerified) {
      return res.status(403).json({ error: 'This staff or department identity has not been verified. Verify with your mobile number / code first to set your password.' });
    }

    // Verify password
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
