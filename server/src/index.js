import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();
const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(serverDirectory, '../../.env') });

import authRoutes from './routes/auth.js';
import deadlineRoutes from './routes/deadlines.js';
import announcementRoutes from './routes/announcements.js';
import eventRoutes from './routes/events.js';
import userRoutes from './routes/users.js';
import timetableRoutes from './routes/timetable.js';

const app = express();
const PORT = process.env.PORT || 3001;
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://localhost:5174,http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

// Middleware
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/deadlines', deadlineRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/users', userRoutes);
app.use('/api/timetable', timetableRoutes);

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`\n  🚀 TTU Dashboard API Server`);
  console.log(`  ➜ Local:   http://localhost:${PORT}`);
  console.log(`  ➜ Health:  http://localhost:${PORT}/api/health`);
  console.log(`  ➜ Ready for requests!\n`);
});
