import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.js';
import { sendVerificationEmail } from '../services/email.js';

const router = Router();
const prisma = new PrismaClient();

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
    const { name, email, password, role = 'student', year, certificate, studentId, indexNumber, staffId, designation, courses } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existing) {
      return res.status(409).json({ error: 'This email is already registered. Use Sign In instead.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

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
      designation: designation || (role === 'admin' ? 'Department Administrator' : null),
      courses: Array.isArray(courses) ? courses : (typeof courses === 'string' ? courses.split(',').map(c => c.trim()).filter(Boolean) : role === 'lecturer' ? ['General Design'] : [])
    };

    const user = await prisma.user.create({ data: userData });
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: formatUser(user),
      message: 'Account created successfully!'
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

const findIdentity = (identifier) => {
  const term = identifier.trim().toLowerCase();
  return prisma.user.findFirst({
    where: {
      OR: [
        { email: term },
        { studentId: { equals: term, mode: 'insensitive' } },
        { staffId: { equals: term, mode: 'insensitive' } }
      ]
    }
  });
};

router.post('/request-verification', async (req, res) => {
  try {
    const { identifier } = req.body;
    if (!identifier) return res.status(400).json({ error: 'Enter your TTU email, index number, or lecturer ID.' });

    const user = await findIdentity(identifier);
    if (!user) return res.status(404).json({ error: 'No preloaded department identity was found.' });

    const code = String(Math.floor(100000 + Math.random() * 900000));
    const verificationCodeHash = await bcrypt.hash(code, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationCodeHash, verificationExpiresAt: new Date(Date.now() + 15 * 60 * 1000) }
    });
    const delivery = await sendVerificationEmail({ to: user.email, name: user.name, code });
    res.json({
      success: true,
      message: delivery.delivered ? 'A verification code was sent to your TTU email.' : 'Verification code created. Configure SMTP to deliver it by email.',
      developmentCode: delivery.developmentCode
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
      return res.status(400).json({ error: 'Request a new verification code before activating your account.' });
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
    res.json({ success: true, message: `Account verified for ${activated.name}. You can now sign in with your TTU email.` });
  } catch (error) {
    console.error('Activate account error:', error);
    res.status(500).json({ error: 'Could not activate your account.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate with email, name, studentId, staffId + password.
 */
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Identifier and password are required.' });
    }

    const term = identifier.trim().toLowerCase();

    // Search by email, name, studentId, or staffId
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: term },
          { name: { equals: term, mode: 'insensitive' } },
          { studentId: { equals: term, mode: 'insensitive' } },
          { staffId: { equals: term, mode: 'insensitive' } }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Account not found. Use your email, full name, index number, or staff ID.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ error: 'This department identity has not been verified. Activate the account first.' });
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
