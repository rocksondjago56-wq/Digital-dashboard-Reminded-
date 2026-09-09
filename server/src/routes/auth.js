import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticate } from '../middleware/auth.js';
import { isEmailDeliveryConfigured, sendVerificationEmail } from '../services/email.js';
import { isSmsDeliveryConfigured, sendVerificationSMS } from '../services/sms.js';

const router = Router();
const prisma = new PrismaClient();
const isProduction = process.env.NODE_ENV === 'production';

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
    isVerified: Boolean(user.isVerified),
    emailVerified: Boolean(user.emailVerified),
    phoneVerified: Boolean(user.phoneVerified),
    completedDeadlines
  };
}

/**
 * POST /api/auth/signup
 * Register a new user account.
 */
/**
 * POST /api/auth/signup
 * Register a new user account with mandatory dual verification (Email & Phone).
 */
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role = 'student', year, certificate, studentId, indexNumber, staffId, phone, designation, courses } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const formattedPhone = phone ? phone.trim() : null;
    if (!formattedPhone) {
      return res.status(400).json({ error: 'Mobile phone number is required for account verification.' });
    }
    if (isProduction && (!isEmailDeliveryConfigured() || !isSmsDeliveryConfigured())) {
      return res.status(503).json({ error: 'Account verification is temporarily unavailable. Contact the department administrator.' });
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (existingEmail) {
      return res.status(409).json({ error: 'This email is already registered. Use Sign In instead.' });
    }

    // Check if phone already exists
    const phoneTerms = getPhoneLookupTerms(formattedPhone);
    const existingPhone = await prisma.user.findFirst({
      where: { OR: phoneTerms.map(value => ({ phone: { contains: value } })) }
    });
    if (existingPhone) {
      return res.status(409).json({ error: 'This mobile number is already registered to an account.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Generate dual verification codes (Email Code and Phone Code)
    const emailCode = String(Math.floor(100000 + Math.random() * 900000));
    const phoneCode = String(Math.floor(100000 + Math.random() * 900000));

    const emailCodeHash = await bcrypt.hash(emailCode, 10);
    const phoneCodeHash = await bcrypt.hash(phoneCode, 10);
    const verificationCodeHash = await bcrypt.hash(emailCode, 10);
    const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

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
      isVerified: false,
      emailVerified: false,
      phoneVerified: false,
      emailCodeHash,
      phoneCodeHash,
      verificationCodeHash,
      verificationExpiresAt
    };

    const user = await prisma.user.create({ data: userData });
    const token = generateToken(user);

    // Dispatch verification codes to both Email and Phone
    const emailRes = await sendVerificationEmail({ to: user.email, name: user.name, code: emailCode });
    const smsRes = await sendVerificationSMS({ to: user.phone, name: user.name, code: phoneCode });

    res.status(201).json({
      success: true,
      token,
      user: formatUser(user),
      requiresVerification: true,
      ...(isProduction ? {} : { developmentEmailCode: emailRes.developmentCode, developmentPhoneCode: smsRes.developmentCode }),
      message: `Account created successfully! Verification codes have been sent to your email (${user.email}) and phone number (${user.phone}). Please enter both codes to verify your account.`
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
    if (!user.phone) return res.status(400).json({ error: 'This account has no registered mobile number. Contact the department administrator.' });
    if (isProduction && (!isEmailDeliveryConfigured() || !isSmsDeliveryConfigured())) {
      return res.status(503).json({ error: 'Account verification is temporarily unavailable. Contact the department administrator.' });
    }

    const emailCode = String(Math.floor(100000 + Math.random() * 900000));
    const phoneCode = String(Math.floor(100000 + Math.random() * 900000));

    const emailCodeHash = await bcrypt.hash(emailCode, 10);
    const phoneCodeHash = await bcrypt.hash(phoneCode, 10);
    const verificationCodeHash = await bcrypt.hash(emailCode, 10);
    const verificationExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailCodeHash,
        phoneCodeHash,
        verificationCodeHash,
        verificationExpiresAt
      }
    });

    const emailRes = await sendVerificationEmail({ to: user.email, name: user.name, code: emailCode });
    const smsRes = await sendVerificationSMS({ to: user.phone, name: user.name, code: phoneCode });

    res.json({
      success: true,
      message: `6-digit verification codes have been sent to your email (${user.email}) and phone number (${user.phone}).`,
      ...(isProduction ? {} : { developmentEmailCode: emailRes.developmentCode, developmentPhoneCode: smsRes.developmentCode })
    });
  } catch (error) {
    console.error('Request verification error:', error);
    res.status(500).json({ error: 'Could not send verification codes.' });
  }
});

router.post('/activate-account', async (req, res) => {
  try {
    const { identifier, emailCode, phoneCode, code, password } = req.body;
    if (!identifier) return res.status(400).json({ error: 'Email or phone number identifier is required.' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const user = await findIdentity(identifier);
    if (!user || (!user.emailCodeHash && !user.verificationCodeHash) || !user.verificationExpiresAt) {
      return res.status(400).json({ error: 'Please request new verification codes before activating your account.' });
    }
    if (user.verificationExpiresAt < new Date()) {
      return res.status(400).json({ error: 'The verification codes have expired. Please request new codes.' });
    }

    // Determine codes submitted
    let inputEmailCode = emailCode ? emailCode.trim() : '';
    let inputPhoneCode = phoneCode ? phoneCode.trim() : '';

    if (!inputEmailCode && !inputPhoneCode && code) {
      const parts = code.split(/[,|;/\s]+/);
      if (parts.length >= 2) {
        inputEmailCode = parts[0];
        inputPhoneCode = parts[1];
      } else {
        inputEmailCode = code.trim();
        inputPhoneCode = code.trim();
      }
    }

    if (!inputEmailCode || !inputPhoneCode) {
      return res.status(400).json({ error: 'Both Email Verification Code and Phone Verification Code are required.' });
    }

    // Check Email Code
    let emailMatch = false;
    if (user.emailCodeHash) {
      emailMatch = await bcrypt.compare(inputEmailCode, user.emailCodeHash);
    } else if (user.verificationCodeHash) {
      emailMatch = await bcrypt.compare(inputEmailCode, user.verificationCodeHash);
    }

    // Check Phone Code
    let phoneMatch = false;
    if (user.phoneCodeHash) {
      phoneMatch = await bcrypt.compare(inputPhoneCode, user.phoneCodeHash);
    } else if (user.verificationCodeHash) {
      phoneMatch = await bcrypt.compare(inputPhoneCode, user.verificationCodeHash);
    }

    if (!emailMatch && !phoneMatch) {
      return res.status(400).json({ error: 'Both Email Code and Phone Code are incorrect.' });
    }
    if (!emailMatch) {
      return res.status(400).json({ error: 'The Email Verification Code is incorrect.' });
    }
    if (!phoneMatch) {
      return res.status(400).json({ error: 'The Phone Verification Code is incorrect.' });
    }

    const updateData = {
      isVerified: true,
      emailVerified: true,
      phoneVerified: true,
      emailCodeHash: null,
      phoneCodeHash: null,
      verificationCodeHash: null,
      verificationExpiresAt: null
    };

    updateData.passwordHash = await bcrypt.hash(password, 12);

    const activated = await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });

    res.json({
      success: true,
      message: `Account dual verification complete for ${activated.name}! Your email and phone number are verified. You can now sign in.`,
      user: formatUser(activated)
    });
  } catch (error) {
    console.error('Activate account error:', error);
    res.status(500).json({ error: 'Could not activate or verify your account.' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate with email, name, studentId, staffId, or mobile phone + password.
 * Blocks unverified users until dual verification is completed.
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

    // Require dual account verification before gaining system access
    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Account verification required. Verification codes were sent to your email and phone number. Please enter both codes to gain access.',
        requiresVerification: true,
        identifier: user.email
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
