import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

const DAY_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/**
 * GET /api/timetable
 * List all timetable slots, sorted by day and time.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const slots = await prisma.timetableSlot.findMany();

    // Sort by day order, then time
    const sorted = slots.sort((a, b) => {
      const dayDiff = DAY_ORDER.indexOf(a.day) - DAY_ORDER.indexOf(b.day);
      if (dayDiff !== 0) return dayDiff;
      return a.time.localeCompare(b.time);
    });

    res.json({ success: true, timetable: sorted });
  } catch (error) {
    console.error('Get timetable error:', error);
    res.status(500).json({ error: 'Failed to fetch timetable.' });
  }
});

/**
 * POST /api/timetable
 * Create a new timetable slot (admin only).
 */
router.post('/', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { day, time, course, room, year } = req.body;

    if (!day || !time || !course || !room) {
      return res.status(400).json({ error: 'Day, time, course, and room are required.' });
    }

    const slot = await prisma.timetableSlot.create({
      data: { day, time, course, room, year: year || 'All Years' }
    });

    res.status(201).json({ success: true, slot });
  } catch (error) {
    console.error('Create timetable slot error:', error);
    res.status(500).json({ error: 'Failed to create timetable slot.' });
  }
});

/**
 * PUT /api/timetable/:id
 * Update a timetable slot (admin only).
 */
router.put('/:id', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.timetableSlot.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'Timetable slot not found.' });
    }

    const { day, time, course, room, year } = req.body;
    const updated = await prisma.timetableSlot.update({
      where: { id },
      data: {
        ...(day !== undefined && { day }),
        ...(time !== undefined && { time }),
        ...(course !== undefined && { course }),
        ...(room !== undefined && { room }),
        ...(year !== undefined && { year })
      }
    });

    res.json({ success: true, slot: updated });
  } catch (error) {
    console.error('Update timetable slot error:', error);
    res.status(500).json({ error: 'Failed to update timetable slot.' });
  }
});

/**
 * DELETE /api/timetable/:id
 * Delete a timetable slot (admin only).
 */
router.delete('/:id', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.timetableSlot.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'Timetable slot not found.' });
    }

    await prisma.timetableSlot.delete({ where: { id } });
    res.json({ success: true, message: 'Timetable slot deleted.' });
  } catch (error) {
    console.error('Delete timetable slot error:', error);
    res.status(500).json({ error: 'Failed to delete timetable slot.' });
  }
});

/**
 * GET /api/timetable/class-groups
 * List all WhatsApp class groups.
 */
router.get('/class-groups', authenticate, async (req, res) => {
  try {
    const groups = await prisma.classWhatsAppGroup.findMany({
      orderBy: { year: 'asc' }
    });

    const formatted = groups.map(g => ({
      id: g.id,
      year: g.year,
      title: g.title,
      headName: g.headName,
      headId: g.headId,
      headPhone: g.headPhone,
      inviteLink: g.inviteLink,
      updatedAt: g.updatedAt.toISOString()
    }));

    res.json({ success: true, classGroups: formatted });
  } catch (error) {
    console.error('Get class groups error:', error);
    res.status(500).json({ error: 'Failed to fetch class groups.' });
  }
});

/**
 * POST /api/timetable/class-groups
 * Create or update a WhatsApp class group.
 */
router.post('/class-groups', authenticate, async (req, res) => {
  try {
    const { year, title, headName, headId, headPhone, inviteLink } = req.body;

    if (!year) {
      return res.status(400).json({ error: 'Year is required.' });
    }

    const group = await prisma.classWhatsAppGroup.upsert({
      where: { year },
      update: {
        title: title || `Year ${year} Class Group`,
        headName: headName || req.user.name,
        headId: headId || req.user.id,
        headPhone: (headPhone || '').replace(/[^0-9]/g, ''),
        inviteLink: (inviteLink || '').trim()
      },
      create: {
        year,
        title: title || `Year ${year} Class Group`,
        headName: headName || req.user.name,
        headId: headId || req.user.id,
        headPhone: (headPhone || '').replace(/[^0-9]/g, ''),
        inviteLink: (inviteLink || '').trim()
      }
    });

    res.json({
      success: true,
      group: {
        id: group.id,
        year: group.year,
        title: group.title,
        headName: group.headName,
        headId: group.headId,
        headPhone: group.headPhone,
        inviteLink: group.inviteLink,
        updatedAt: group.updatedAt.toISOString()
      }
    });
  } catch (error) {
    console.error('Save class group error:', error);
    res.status(500).json({ error: 'Failed to save class group.' });
  }
});

/**
 * DELETE /api/timetable/class-groups/:id
 * Delete a WhatsApp class group.
 */
router.delete('/class-groups/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const group = await prisma.classWhatsAppGroup.findUnique({ where: { id } });

    if (!group) {
      return res.status(404).json({ error: 'Class group not found.' });
    }

    await prisma.classWhatsAppGroup.delete({ where: { id } });
    res.json({ success: true, message: 'Class group deleted.' });
  } catch (error) {
    console.error('Delete class group error:', error);
    res.status(500).json({ error: 'Failed to delete class group.' });
  }
});

export default router;
