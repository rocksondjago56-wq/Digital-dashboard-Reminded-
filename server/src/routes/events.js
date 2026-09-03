import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/events
 * List all events with author info.
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const events = await prisma.event.findMany({
      include: { author: { select: { name: true, role: true } } },
      orderBy: { eventDate: 'asc' }
    });

    const formatted = events.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      location: e.location,
      date: e.eventDate.toISOString().split('T')[0],
      time: e.eventTime,
      type: e.type,
      organizer: e.organizer,
      author: e.author?.name || 'Department',
      authorRole: e.author?.role || 'admin'
    }));

    res.json({ success: true, events: formatted });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events.' });
  }
});

/**
 * POST /api/events
 * Create a new event (admin only).
 */
router.post('/', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { title, description, location, date, time, type, organizer } = req.body;

    if (!title || !location || !date || !type || !organizer) {
      return res.status(400).json({ error: 'Title, location, date, type, and organizer are required.' });
    }

    const event = await prisma.event.create({
      data: {
        title,
        description: description || null,
        location,
        eventDate: new Date(date),
        eventTime: time || null,
        type,
        organizer,
        authorId: req.user.id
      },
      include: { author: { select: { name: true, role: true } } }
    });

    res.status(201).json({
      success: true,
      event: {
        id: event.id,
        title: event.title,
        description: event.description,
        location: event.location,
        date: event.eventDate.toISOString().split('T')[0],
        time: event.eventTime,
        type: event.type,
        organizer: event.organizer,
        author: event.author?.name || 'Department',
        authorRole: event.author?.role || 'admin'
      }
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event.' });
  }
});

/**
 * PUT /api/events/:id
 * Update an event (admin only).
 */
router.put('/:id', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    const { title, description, location, date, time, type, organizer } = req.body;
    const updated = await prisma.event.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(location !== undefined && { location }),
        ...(date && { eventDate: new Date(date) }),
        ...(time !== undefined && { eventTime: time }),
        ...(type !== undefined && { type }),
        ...(organizer !== undefined && { organizer })
      },
      include: { author: { select: { name: true, role: true } } }
    });

    res.json({
      success: true,
      event: {
        id: updated.id,
        title: updated.title,
        description: updated.description,
        location: updated.location,
        date: updated.eventDate.toISOString().split('T')[0],
        time: updated.eventTime,
        type: updated.type,
        organizer: updated.organizer,
        author: updated.author?.name || 'Department',
        authorRole: updated.author?.role || 'admin'
      }
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event.' });
  }
});

/**
 * DELETE /api/events/:id
 * Delete an event (admin only).
 */
router.delete('/:id', authenticate, requireAdmin(), async (req, res) => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      return res.status(404).json({ error: 'Event not found.' });
    }

    await prisma.event.delete({ where: { id } });
    res.json({ success: true, message: 'Event deleted.' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event.' });
  }
});

export default router;
