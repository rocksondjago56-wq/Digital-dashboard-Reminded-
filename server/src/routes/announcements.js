import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireStaff } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/announcements
 * List all announcements with author info.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const announcements = await prisma.announcement.findMany({
      include: { author: { select: { name: true, role: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const formatted = announcements.map(a => ({
      id: a.id,
      title: a.title,
      content: a.content,
      category: a.category,
      isPinned: a.isPinned,
      date: a.createdAt.toISOString().split('T')[0],
      author: a.author?.name || 'Department',
      authorRole: a.author?.role || 'lecturer'
    }));

    res.json({ success: true, announcements: formatted });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({ error: 'Failed to fetch announcements.' });
  }
});

/**
 * POST /api/announcements
 * Create a new announcement (staff only).
 */
router.post('/', authenticate, requireStaff(), async (req, res) => {
  try {
    const { title, content, category, isPinned } = req.body;

    if (!title || !content || !category) {
      return res.status(400).json({ error: 'Title, content, and category are required.' });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        category,
        isPinned: isPinned || false,
        authorId: req.user.id
      },
      include: { author: { select: { name: true, role: true } } }
    });

    res.status(201).json({
      success: true,
      announcement: {
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        category: announcement.category,
        isPinned: announcement.isPinned,
        date: announcement.createdAt.toISOString().split('T')[0],
        author: announcement.author?.name || 'Department',
        authorRole: announcement.author?.role || 'lecturer'
      }
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({ error: 'Failed to create announcement.' });
  }
});

/**
 * PUT /api/announcements/:id
 * Update an announcement (author or admin only).
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await prisma.announcement.findUnique({ where: { id } });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    if (announcement.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the author or an admin can update this announcement.' });
    }

    const { title, content, category, isPinned } = req.body;
    const updated = await prisma.announcement.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(category !== undefined && { category }),
        ...(isPinned !== undefined && { isPinned })
      },
      include: { author: { select: { name: true, role: true } } }
    });

    res.json({
      success: true,
      announcement: {
        id: updated.id,
        title: updated.title,
        content: updated.content,
        category: updated.category,
        isPinned: updated.isPinned,
        date: updated.createdAt.toISOString().split('T')[0],
        author: updated.author?.name || 'Department',
        authorRole: updated.author?.role || 'lecturer'
      }
    });
  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({ error: 'Failed to update announcement.' });
  }
});

/**
 * DELETE /api/announcements/:id
 * Delete an announcement (author or admin only).
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const announcement = await prisma.announcement.findUnique({ where: { id } });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found.' });
    }

    if (announcement.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the author or an admin can delete this announcement.' });
    }

    await prisma.announcement.delete({ where: { id } });
    res.json({ success: true, message: 'Announcement deleted.' });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({ error: 'Failed to delete announcement.' });
  }
});

export default router;
