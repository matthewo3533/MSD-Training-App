import express from 'express';
import prisma from '../utils/db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Role } from '../types/Role';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get audit logs (Admin only)
router.get('/', authorize('ADMIN'), async (req, res) => {
  try {
    const { entityType, entityId, userId, startDate, endDate, limit = '100' } = req.query;

    const where: any = {};

    if (entityType) where.entityType = entityType;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
    });

    res.json(logs);
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get audit log for specific entity
router.get('/:entityType/:entityId', authorize('ADMIN', 'MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { entityType, entityId } = req.params;

    // Check access for managers
    if (req.user!.role === 'MANAGER') {
      // Managers can only see audit logs for their intakes
      if (entityType === 'Intake' || entityType === 'SkillGroup' || entityType === 'Skill') {
        // Verify access
        let intakeId = entityId;

        if (entityType === 'SkillGroup') {
          const skillGroup = await prisma.skillGroup.findUnique({
            where: { id: entityId },
            select: { intakeId: true },
          });
          if (!skillGroup) {
            return res.status(404).json({ error: 'Entity not found' });
          }
          intakeId = skillGroup.intakeId;
        } else if (entityType === 'Skill') {
          const skill = await prisma.skill.findUnique({
            where: { id: entityId },
            include: {
              skillGroup: {
                select: { intakeId: true },
              },
            },
          });
          if (!skill) {
            return res.status(404).json({ error: 'Entity not found' });
          }
          intakeId = skill.skillGroup.intakeId;
        }

        const intake = await prisma.intake.findUnique({
          where: { id: intakeId },
          select: { createdBy: true },
        });

        if (!intake || intake.createdBy !== req.user!.id) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        entityType,
        entityId,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(logs);
  } catch (error) {
    console.error('Get entity audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

