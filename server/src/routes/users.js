import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendVerificationEmail } from '../services/email.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/users
 * List all users (authenticated users).
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        department: true,
        year: true,
        certificate: true,
        studentId: true,
        staffId: true,
        designation: true,
        courses: true,
        profilePictureUrl: true,
        isVerified: true
      },
      orderBy: { name: 'asc' }
    });

    const formatted = users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      department: u.department,
      year: u.year,
      certificate: u.certificate,
      studentId: u.studentId,
      staffId: u.staffId,
      indexNumber: u.studentId,
      designation: u.designation,
      courses: u.courses || [],
      profilePic: u.profilePictureUrl,
      isVerified: u.isVerified
    }));

    res.json({ success: true, users: formatted });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
});

router.post('/provision', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { name, role, indexNumber, staffId, year, certificate, courses, designation } = req.body;
    if (!name || !['student', 'lecturer'].includes(role)) {
      return res.status(400).json({ error: 'Name and a student or lecturer role are required.' });
    }

    const identifier = role === 'student' ? indexNumber?.trim() : staffId?.trim();
    if (!identifier) return res.status(400).json({ error: role === 'student' ? 'Student index number is required.' : 'Lecturer ID is required.' });
    if (role === 'student' && (!year || !certificate)) return res.status(400).json({ error: 'Student year and certificate programme are required.' });

    const email = `${identifier.replace(/[^a-z0-9]/gi, '').toLowerCase()}@ttu.edu.gh`;
    const exists = await prisma.user.findFirst({ where: { OR: [{ email }, ...(role === 'student' ? [{ studentId: identifier }] : [{ staffId: identifier }])] } });
    if (exists) return res.status(409).json({ error: 'An identity with this email or ID already exists.' });

    const code = String(crypto.randomInt(100000, 1000000));
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email,
        passwordHash: await bcrypt.hash(crypto.randomUUID(), 12),
        role,
        department: 'Graphic Design',
        studentId: role === 'student' ? identifier : null,
        staffId: role === 'lecturer' ? identifier : null,
        year: role === 'student' ? year : null,
        certificate: role === 'student' ? certificate : null,
        courses: role === 'lecturer' ? (Array.isArray(courses) ? courses : String(courses || '').split(',').map(course => course.trim()).filter(Boolean)) : [],
        designation: role === 'lecturer' ? designation || 'Lecturer' : null,
        isVerified: false,
        verificationCodeHash: await bcrypt.hash(code, 10),
        verificationExpiresAt: new Date(Date.now() + 15 * 60 * 1000)
      }
    });
    const delivery = await sendVerificationEmail({ to: user.email, name: user.name, code });
    res.status(201).json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified },
      message: delivery.delivered ? 'Identity provisioned and verification email sent.' : 'Identity provisioned. Configure SMTP to send verification emails.',
      developmentCode: delivery.developmentCode
    });
  } catch (error) {
    console.error('Provision identity error:', error);
    res.status(500).json({ error: 'Could not provision the department identity.' });
  }
});

/**
 * PUT /api/users/:id/role
 * Update a user's role (admin only).
 */
router.put('/:id/role', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !['student', 'student_head', 'lecturer', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required (student, student_head, lecturer, admin).' });
    }

    // Prevent admin from changing their own role
    if (id === req.user.id) {
      return res.status(403).json({ error: 'You cannot change your own role.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role }
    });

    res.json({
      success: true,
      user: {
        id: updated.id,
        name: updated.name,
        role: updated.role
      }
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update user role.' });
  }
});

/**
 * PUT /api/users/:id/profile-pic
 * Update user's profile picture (own profile only).
 * Accepts a base64 data URL in the request body.
 */
router.put('/:id/profile-pic', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    // Only the user themselves can update their profile pic
    if (id !== req.user.id) {
      return res.status(403).json({ error: 'You can only update your own profile picture.' });
    }

    const { profilePic } = req.body;

    if (!profilePic) {
      return res.status(400).json({ error: 'Profile picture data is required.' });
    }

    await prisma.user.update({
      where: { id },
      data: { profilePictureUrl: profilePic }
    });

    res.json({ success: true, message: 'Profile picture updated.' });
  } catch (error) {
    console.error('Update profile pic error:', error);
    res.status(500).json({ error: 'Failed to update profile picture.' });
  }
});

export default router;
