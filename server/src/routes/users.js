import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.js';

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
        profilePictureUrl: true
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
      profilePic: u.profilePictureUrl
    }));

    res.json({ success: true, users: formatted });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users.' });
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
