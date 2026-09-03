import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireStaff } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/deadlines
 * List all deadlines with author info.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const deadlines = await prisma.deadline.findMany({
      include: { author: { select: { name: true, role: true } } },
      orderBy: { dueDate: 'asc' }
    });

    const formatted = deadlines.map(d => ({
      id: d.id,
      title: d.title,
      description: d.description,
      course: d.course,
      dueDate: d.dueDate.toISOString().split('T')[0],
      type: d.type,
      status: 'pending',
      author: d.author?.name || 'Department',
      authorRole: d.author?.role || 'lecturer',
      attachment: d.attachmentUrl ? { name: d.attachmentName, dataUrl: d.attachmentUrl } : null
    }));

    res.json({ success: true, deadlines: formatted });
  } catch (error) {
    console.error('Get deadlines error:', error);
    res.status(500).json({ error: 'Failed to fetch deadlines.' });
  }
});

/**
 * POST /api/deadlines
 * Create a new deadline (staff only).
 */
router.post('/', authenticate, requireStaff(), async (req, res) => {
  try {
    const { title, description, course, dueDate, type, attachment } = req.body;

    if (!title || !description || !course || !dueDate || !type) {
      return res.status(400).json({ error: 'Title, description, course, dueDate, and type are required.' });
    }

    const deadline = await prisma.deadline.create({
      data: {
        title,
        description,
        course,
        dueDate: new Date(dueDate),
        type,
        authorId: req.user.id,
        attachmentName: attachment?.name || null,
        attachmentUrl: attachment?.dataUrl || null
      },
      include: { author: { select: { name: true, role: true } } }
    });

    res.status(201).json({
      success: true,
      deadline: {
        id: deadline.id,
        title: deadline.title,
        description: deadline.description,
        course: deadline.course,
        dueDate: deadline.dueDate.toISOString().split('T')[0],
        type: deadline.type,
        status: 'pending',
        author: deadline.author?.name || 'Department',
        authorRole: deadline.author?.role || 'lecturer',
        attachment: deadline.attachmentUrl ? { name: deadline.attachmentName, dataUrl: deadline.attachmentUrl } : null
      }
    });
  } catch (error) {
    console.error('Create deadline error:', error);
    res.status(500).json({ error: 'Failed to create deadline.' });
  }
});

/**
 * PUT /api/deadlines/:id
 * Update a deadline (author or admin only).
 */
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const deadline = await prisma.deadline.findUnique({ where: { id } });

    if (!deadline) {
      return res.status(404).json({ error: 'Deadline not found.' });
    }

    // Only author or admin can update
    if (deadline.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the author or an admin can update this deadline.' });
    }

    const { title, description, course, dueDate, type } = req.body;
    const updated = await prisma.deadline.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(course && { course }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(type && { type })
      },
      include: { author: { select: { name: true, role: true } } }
    });

    res.json({
      success: true,
      deadline: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        course: updated.course,
        dueDate: updated.dueDate.toISOString().split('T')[0],
        type: updated.type,
        status: 'pending',
        author: updated.author?.name || 'Department',
        authorRole: updated.author?.role || 'lecturer'
      }
    });
  } catch (error) {
    console.error('Update deadline error:', error);
    res.status(500).json({ error: 'Failed to update deadline.' });
  }
});

/**
 * DELETE /api/deadlines/:id
 * Delete a deadline (author or admin only).
 */
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const deadline = await prisma.deadline.findUnique({ where: { id } });

    if (!deadline) {
      return res.status(404).json({ error: 'Deadline not found.' });
    }

    if (deadline.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the author or an admin can delete this deadline.' });
    }

    // Delete related completions first
    await prisma.deadlineCompletion.deleteMany({ where: { deadlineId: id } });
    await prisma.deadline.delete({ where: { id } });

    res.json({ success: true, message: 'Deadline deleted.' });
  } catch (error) {
    console.error('Delete deadline error:', error);
    res.status(500).json({ error: 'Failed to delete deadline.' });
  }
});

/**
 * POST /api/deadlines/:id/toggle-complete
 * Toggle deadline completion for the current student.
 */
router.post('/:id/toggle-complete', authenticate, async (req, res) => {
  try {
    if (!['student', 'student_head'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Only students can mark deadlines as completed.' });
    }

    const { id } = req.params;
    const existing = await prisma.deadlineCompletion.findUnique({
      where: { studentId_deadlineId: { studentId: req.user.id, deadlineId: id } }
    });

    if (existing) {
      await prisma.deadlineCompletion.delete({
        where: { studentId_deadlineId: { studentId: req.user.id, deadlineId: id } }
      });
    } else {
      await prisma.deadlineCompletion.create({
        data: { studentId: req.user.id, deadlineId: id }
      });
    }

    // Return updated list of completions
    const completions = await prisma.deadlineCompletion.findMany({
      where: { studentId: req.user.id },
      select: { deadlineId: true }
    });

    res.json({
      success: true,
      completedDeadlines: completions.map(c => c.deadlineId)
    });
  } catch (error) {
    console.error('Toggle completion error:', error);
    res.status(500).json({ error: 'Failed to toggle deadline completion.' });
  }
});

export default router;
