import express, { Response } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Role } from '../types/Role';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all users (Admin only)
router.get('/', authorize('ADMIN'), async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (Admin only)
router.post(
  '/',
  authorize('ADMIN'),
  [
    body('username').notEmpty().withMessage('Username is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters'),
    body('role').isIn(['ADMIN', 'MANAGER', 'TRAINER', 'TRAINEE']).withMessage('Invalid role'),
  ],
  auditLog('CREATE_USER', 'User'),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Check user limit
      const userCount = await prisma.user.count();
      if (userCount >= 50) {
        return res.status(400).json({ error: 'Maximum of 50 users allowed' });
      }

      const { username, password, role } = req.body;

      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          username,
          password: hashedPassword,
          role,
        },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
        },
      });

      res.status(201).json(user);
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update user role (Admin only)
router.patch(
  '/:id/role',
  authorize('ADMIN'),
  [body('role').isIn(Object.values(Role)).withMessage('Invalid role')],
  auditLog('UPDATE_USER_ROLE', 'User', (req) => req.params.id),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { role } = req.body;

      const oldUser = await prisma.user.findUnique({
        where: { id },
        select: { role: true },
      });

      if (!oldUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = await prisma.user.update({
        where: { id },
        data: { role },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
        },
      });

      // Log role change
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE_USER_ROLE',
          entityType: 'User',
          entityId: id,
          oldValue: JSON.stringify({ role: oldUser.role }),
          newValue: JSON.stringify({ role }),
        },
      });

      res.json(user);
    } catch (error) {
      console.error('Update user role error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete user (Admin only)
router.delete(
  '/:id',
  authorize('ADMIN'),
  auditLog('DELETE_USER', 'User', (req) => req.params.id),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      if (id === req.user!.id) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      await prisma.user.delete({
        where: { id },
      });

      res.json({ message: 'User deleted successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

