import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Middleware: Verify JWT token and attach user to request.
 * Sets req.user with the full user record from the database.
 */
export function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please provide a valid token.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Attach user info from token
    prisma.user.findUnique({ where: { id: decoded.userId } })
      .then(user => {
        if (!user) {
          return res.status(401).json({ error: 'User not found. Token may be invalid.' });
        }
        req.user = user;
        next();
      })
      .catch(() => {
        return res.status(500).json({ error: 'Failed to verify user.' });
      });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Middleware: Require user to have a specific role.
 * Must be used AFTER authenticate middleware.
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}.` });
    }
    next();
  };
}

/**
 * Middleware: Require user to be staff (lecturer or admin).
 * Must be used AFTER authenticate middleware.
 */
export function requireStaff() {
  return requireRole('lecturer', 'admin');
}

/**
 * Middleware: Require user to be admin.
 * Must be used AFTER authenticate middleware.
 */
export function requireAdmin() {
  return requireRole('admin');
}

export default { authenticate, requireRole, requireStaff, requireAdmin };
