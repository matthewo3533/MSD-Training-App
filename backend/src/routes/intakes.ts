import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Role } from '../types/Role';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all intakes (based on role)
router.get('/', async (req: AuthRequest, res) => {
  try {
    let intakes;

    if (req.user!.role === 'ADMIN') {
      // Admin sees all intakes
      intakes = await prisma.intake.findMany({
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  role: true,
                },
              },
            },
          },
          _count: {
            select: {
              members: true,
              skillGroups: true,
              trainingSessions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (req.user!.role === 'MANAGER') {
      // Manager sees intakes they created
      intakes = await prisma.intake.findMany({
        where: { createdBy: req.user!.id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  role: true,
                },
              },
            },
          },
          _count: {
            select: {
              members: true,
              skillGroups: true,
              trainingSessions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else if (req.user!.role === 'TRAINER') {
      // Trainer sees intakes they have sessions for
      const sessions = await prisma.trainingSession.findMany({
        where: { trainerId: req.user!.id },
        select: { intakeId: true },
        distinct: ['intakeId'],
      });

      intakes = await prisma.intake.findMany({
        where: {
          id: { in: sessions.map((s) => s.intakeId) },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  role: true,
                },
              },
            },
          },
          _count: {
            select: {
              members: true,
              skillGroups: true,
              trainingSessions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } else {
      // Trainee sees only their intakes
      const memberships = await prisma.intakeMember.findMany({
        where: { userId: req.user!.id },
        select: { intakeId: true },
      });

      intakes = await prisma.intake.findMany({
        where: {
          id: { in: memberships.map((m) => m.intakeId) },
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  role: true,
                },
              },
            },
          },
          _count: {
            select: {
              members: true,
              skillGroups: true,
              trainingSessions: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // Calculate progress for each trainee in each intake
    const intakesWithProgress = await Promise.all(
      intakes.map(async (intake) => {
        const membersWithProgress = await Promise.all(
          intake.members.map(async (member) => {
            // Get latest session for this trainee in this intake
            const latestSession = await prisma.trainingSession.findFirst({
              where: {
                intakeId: intake.id,
                traineeId: member.user.id,
              },
              include: {
                skillRatings: {
                  select: {
                    score: true,
                  },
                },
              },
              orderBy: {
                sessionDate: 'desc',
              },
            });

            // Calculate average score from latest session
            let averageScore = 0;
            let progress = 'No sessions yet';
            let progressColor = 'gray';

            if (latestSession && latestSession.skillRatings.length > 0) {
              const scores = latestSession.skillRatings.map((r) => r.score);
              averageScore = scores.reduce((a, b) => a + b, 0) / scores.length;

              if (averageScore >= 8) {
                progress = 'Excellent';
                progressColor = 'green';
              } else if (averageScore >= 6) {
                progress = 'Good';
                progressColor = 'blue';
              } else if (averageScore >= 4) {
                progress = 'Fair';
                progressColor = 'yellow';
              } else {
                progress = 'Needs Improvement';
                progressColor = 'red';
              }
            }

            return {
              ...member,
              progress: {
                averageScore: Math.round(averageScore * 10) / 10,
                label: progress,
                color: progressColor,
              },
            };
          })
        );

        return {
          ...intake,
          members: membersWithProgress,
        };
      })
    );

    res.json(intakesWithProgress);
  } catch (error) {
    console.error('Get intakes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single intake
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    // Check access
    if (req.user!.role !== 'ADMIN' && req.user!.role !== 'MANAGER') {
      // Check if user is a member or trainer
      const membership = await prisma.intakeMember.findUnique({
        where: {
          intakeId_userId: {
            intakeId: id,
            userId: req.user!.id,
          },
        },
      });

      const hasSession = await prisma.trainingSession.findFirst({
        where: {
          intakeId: id,
          trainerId: req.user!.id,
        },
      });

      const isManager = await prisma.intake.findFirst({
        where: {
          id,
          createdBy: req.user!.id,
        },
      });

      if (!membership && !hasSession && !isManager) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const intake = await prisma.intake.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                role: true,
              },
            },
          },
        },
        skillGroups: {
          include: {
            _count: {
              select: { skills: true },
            },
          },
        },
        _count: {
          select: {
            trainingSessions: true,
          },
        },
      },
    });

    if (!intake) {
      return res.status(404).json({ error: 'Intake not found' });
    }

    res.json(intake);
  } catch (error) {
    console.error('Get intake error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create intake (Admin or Manager)
router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  [body('name').notEmpty().withMessage('Name is required')],
  auditLog('CREATE_INTAKE', 'Intake'),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { name, description } = req.body;

      const intake = await prisma.intake.create({
        data: {
          name,
          description: description || null,
          createdBy: req.user!.id,
        },
        include: {
          _count: {
            select: {
              members: true,
              skillGroups: true,
              trainingSessions: true,
            },
          },
        },
      });

      res.status(201).json(intake);
    } catch (error) {
      console.error('Create intake error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update intake (Admin or Manager who created it)
router.patch(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  auditLog('UPDATE_INTAKE', 'Intake', (req) => req.params.id),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      // Check if user is creator or admin
      const intake = await prisma.intake.findUnique({
        where: { id },
      });

      if (!intake) {
        return res.status(404).json({ error: 'Intake not found' });
      }

      if (req.user!.role !== 'ADMIN' && intake.createdBy !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const oldIntake = { ...intake };

      const updatedIntake = await prisma.intake.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
        },
        include: {
          _count: {
            select: {
              members: true,
              skillGroups: true,
              trainingSessions: true,
            },
          },
        },
      });

      // Log update
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE_INTAKE',
          entityType: 'Intake',
          entityId: id,
          oldValue: JSON.stringify(oldIntake),
          newValue: JSON.stringify(updatedIntake),
        },
      });

      res.json(updatedIntake);
    } catch (error) {
      console.error('Update intake error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete intake (Admin only)
router.delete(
  '/:id',
  authorize('ADMIN'),
  auditLog('DELETE_INTAKE', 'Intake', (req) => req.params.id),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;

      await prisma.intake.delete({
        where: { id },
      });

      res.json({ message: 'Intake deleted successfully' });
    } catch (error) {
      console.error('Delete intake error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Add trainee to intake (Admin or Manager)
router.post(
  '/:id/members',
  authorize('ADMIN', 'MANAGER'),
  [body('userId').notEmpty().withMessage('User ID is required')],
  auditLog('ADD_INTAKE_MEMBER', 'IntakeMember', (req) => req.params.id),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { userId } = req.body;

      // Check access
      const intake = await prisma.intake.findUnique({
        where: { id },
      });

      if (!intake) {
        return res.status(404).json({ error: 'Intake not found' });
      }

      if (req.user!.role !== 'ADMIN' && intake.createdBy !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Check if user exists and is a trainee
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const member = await prisma.intakeMember.create({
        data: {
          intakeId: id,
          userId,
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
      });

      res.status(201).json(member);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'User is already a member of this intake' });
      }
      console.error('Add member error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Remove trainee from intake (Admin or Manager)
router.delete(
  '/:id/members/:userId',
  authorize('ADMIN', 'MANAGER'),
  auditLog('REMOVE_INTAKE_MEMBER', 'IntakeMember', (req) => req.params.id),
  async (req: AuthRequest, res) => {
    try {
      const { id, userId } = req.params;

      // Check access
      const intake = await prisma.intake.findUnique({
        where: { id },
      });

      if (!intake) {
        return res.status(404).json({ error: 'Intake not found' });
      }

      if (req.user!.role !== 'ADMIN' && intake.createdBy !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await prisma.intakeMember.delete({
        where: {
          intakeId_userId: {
            intakeId: id,
            userId,
          },
        },
      });

      res.json({ message: 'Member removed successfully' });
    } catch (error: any) {
      if (error.code === 'P2025') {
        return res.status(404).json({ error: 'Member not found' });
      }
      console.error('Remove member error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

