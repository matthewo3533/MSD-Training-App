import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import prisma from '../utils/db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Role } from '../types/Role';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get training sessions (role-based)
router.get('/', async (req: AuthRequest, res) => {
  try {
    let sessions;

    if (req.user!.role === 'ADMIN' || req.user!.role === 'MANAGER') {
      // Admin/Manager sees sessions for their intakes
      const intakeId = req.query.intakeId as string | undefined;
      const traineeId = req.query.traineeId as string | undefined;

      const where: any = {};
      if (intakeId) where.intakeId = intakeId;
      if (traineeId) where.traineeId = traineeId;

      if (req.user!.role === 'MANAGER') {
        // Manager only sees their intakes
        const intakes = await prisma.intake.findMany({
          where: { createdBy: req.user!.id },
          select: { id: true },
        });
        where.intakeId = { in: intakes.map((i) => i.id) };
      }

      sessions = await prisma.trainingSession.findMany({
        where,
        include: {
          trainee: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          trainer: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          intake: {
            select: {
              id: true,
              name: true,
            },
          },
          skillRatings: {
            include: {
              skill: {
                include: {
                  skillGroup: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          dailySummary: true,
        },
        orderBy: { sessionDate: 'desc' },
      });
    } else if (req.user!.role === 'TRAINER') {
      // Trainer sees sessions they created or are assigned to
      const where: any = { trainerId: req.user!.id };
      const intakeId = req.query.intakeId as string | undefined;
      const traineeId = req.query.traineeId as string | undefined;

      if (intakeId) where.intakeId = intakeId;
      if (traineeId) where.traineeId = traineeId;

      sessions = await prisma.trainingSession.findMany({
        where,
        include: {
          trainee: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          trainer: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          intake: {
            select: {
              id: true,
              name: true,
            },
          },
          skillRatings: {
            include: {
              skill: {
                include: {
                  skillGroup: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          dailySummary: true,
        },
        orderBy: { sessionDate: 'desc' },
      });
    } else {
      // Trainee sees only their sessions
      sessions = await prisma.trainingSession.findMany({
        where: { traineeId: req.user!.id },
        include: {
          trainee: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          trainer: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          intake: {
            select: {
              id: true,
              name: true,
            },
          },
          skillRatings: {
            include: {
              skill: {
                include: {
                  skillGroup: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          dailySummary: true,
        },
        orderBy: { sessionDate: 'desc' },
      });
    }

    res.json(sessions);
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single session
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const session = await prisma.trainingSession.findUnique({
      where: { id },
      include: {
        trainee: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        trainer: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        intake: {
          select: {
            id: true,
            name: true,
          },
        },
        skillRatings: {
          include: {
            skill: {
              include: {
                skillGroup: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        dailySummary: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Check access
    const userRole = req.user!.role;
    
    // Admin has full access
    if (userRole === 'ADMIN') {
      // Allow access
    }
    // Manager - check if they created the intake
    else if (userRole === 'MANAGER') {
      const intake = await prisma.intake.findUnique({
        where: { id: session.intakeId },
      });
      if (!intake || intake.createdBy !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    // Trainer or Trainee - must be the trainer or trainee for this session
    else if (session.traineeId !== req.user!.id && session.trainerId !== req.user!.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(session);
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create training session (Trainer, Manager, Admin)
router.post(
  '/',
  authorize('ADMIN', 'MANAGER', 'TRAINER'),
  [
    body('intakeId').notEmpty().withMessage('Intake ID is required'),
    body('traineeId').notEmpty().withMessage('Trainee ID is required'),
    body('sessionDate').isISO8601().withMessage('Valid session date is required'),
    body('skillRatings').isArray().withMessage('Skill ratings must be an array'),
  ],
  auditLog('CREATE_TRAINING_SESSION', 'TrainingSession'),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { intakeId, traineeId, sessionDate, comments, skillRatings } = req.body;

      // Check access
      const intake = await prisma.intake.findUnique({
        where: { id: intakeId },
      });

      if (!intake) {
        return res.status(404).json({ error: 'Intake not found' });
      }

      // Check if user has access to this intake
      if (req.user!.role === 'MANAGER' && intake.createdBy !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (req.user!.role === 'TRAINER') {
        // Trainer can only create sessions if they have a session in this intake
        const hasSession = await prisma.trainingSession.findFirst({
          where: {
            intakeId,
            trainerId: req.user!.id,
          },
        });
        if (!hasSession) {
          // Check if trainee is in the intake
          const membership = await prisma.intakeMember.findUnique({
            where: {
              intakeId_userId: {
                intakeId,
                userId: traineeId,
              },
            },
          });
          if (!membership) {
            return res.status(403).json({ error: 'Trainee is not in this intake' });
          }
        }
      }

      // Validate skill ratings
      for (const rating of skillRatings) {
        if (!rating.skillId || rating.score === undefined) {
          return res.status(400).json({ error: 'Each rating must have skillId and score' });
        }
        if (rating.score < 0 || rating.score > 10) {
          return res.status(400).json({ error: 'Score must be between 0 and 10' });
        }
      }

      // Create session with ratings in transaction
      const session = await prisma.trainingSession.create({
        data: {
          intakeId,
          traineeId,
          trainerId: req.user!.id,
          sessionDate: new Date(sessionDate),
          comments: comments || null,
          skillRatings: {
            create: skillRatings.map((rating: any) => ({
              skillId: rating.skillId,
              score: rating.score,
              comments: rating.comments || null,
            })),
          },
        },
        include: {
          trainee: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          trainer: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          intake: {
            select: {
              id: true,
              name: true,
            },
          },
          skillRatings: {
            include: {
              skill: {
                include: {
                  skillGroup: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      res.status(201).json(session);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Duplicate rating for skill in this session' });
      }
      console.error('Create session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update training session (Trainer, Manager, Admin)
router.patch(
  '/:id',
  authorize('ADMIN', 'MANAGER', 'TRAINER'),
  [
    body('sessionDate').optional().isISO8601().withMessage('Valid session date is required'),
    body('skillRatings').optional().isArray().withMessage('Skill ratings must be an array'),
  ],
  auditLog('UPDATE_TRAINING_SESSION', 'TrainingSession', (req) => req.params.id),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { sessionDate, comments, skillRatings } = req.body;

      const session = await prisma.trainingSession.findUnique({
        where: { id },
        include: {
          intake: true,
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check access
      if (req.user!.role === 'MANAGER' && session.intake.createdBy !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      if (req.user!.role === 'TRAINER' && session.trainerId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const oldSession = { ...session };

      // Update session
      const updateData: any = {};
      if (sessionDate) updateData.sessionDate = new Date(sessionDate);
      if (comments !== undefined) updateData.comments = comments;

      // Update skill ratings if provided
      if (skillRatings) {
        // Validate ratings
        for (const rating of skillRatings) {
          if (rating.score !== undefined && (rating.score < 0 || rating.score > 10)) {
            return res.status(400).json({ error: 'Score must be between 0 and 10' });
          }
        }

        // Delete existing ratings
        await prisma.skillRating.deleteMany({
          where: { trainingSessionId: id },
        });

        // Create new ratings
        if (skillRatings.length > 0) {
          await prisma.skillRating.createMany({
            data: skillRatings.map((rating: any) => ({
              trainingSessionId: id,
              skillId: rating.skillId,
              score: rating.score,
              comments: rating.comments || null,
            })),
          });
        }
      }

      const updatedSession = await prisma.trainingSession.update({
        where: { id },
        data: updateData,
        include: {
          trainee: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          trainer: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
          intake: {
            select: {
              id: true,
              name: true,
            },
          },
          skillRatings: {
            include: {
              skill: {
                include: {
                  skillGroup: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          dailySummary: true,
        },
      });

      // Log update
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE_TRAINING_SESSION',
          entityType: 'TrainingSession',
          entityId: id,
          oldValue: JSON.stringify(oldSession),
          newValue: JSON.stringify(updatedSession),
        },
      });

      res.json(updatedSession);
    } catch (error) {
      console.error('Update session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete training session (Admin, Manager)
router.delete(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  auditLog('DELETE_TRAINING_SESSION', 'TrainingSession', (req) => req.params.id),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const session = await prisma.trainingSession.findUnique({
        where: { id },
        include: {
          intake: true,
        },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      if (req.user!.role === 'MANAGER' && session.intake.createdBy !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await prisma.trainingSession.delete({
        where: { id },
      });

      res.json({ message: 'Session deleted successfully' });
    } catch (error) {
      console.error('Delete session error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Create or update daily summary (Trainee)
router.post(
  '/:id/summary',
  authorize('TRAINEE', 'ADMIN', 'MANAGER', 'TRAINER'),
  [body('content').notEmpty().withMessage('Content is required')],
  auditLog('UPDATE_DAILY_SUMMARY', 'DailySummary', (req) => req.params.id),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { content } = req.body;

      const session = await prisma.trainingSession.findUnique({
        where: { id },
      });

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      // Check access
      if (req.user!.role === 'TRAINEE' && session.traineeId !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const summary = await prisma.dailySummary.upsert({
        where: { trainingSessionId: id },
        update: {
          content,
          userId: req.user!.id, // Update to current user (trainer) if summary already exists
        },
        create: {
          trainingSessionId: id,
          userId: req.user!.id, // Use current logged-in user (trainer), not trainee
          content,
        },
      });

      res.json(summary);
    } catch (error) {
      console.error('Update summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

export default router;

