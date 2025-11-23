import express, { Response } from 'express';
import { body, validationResult } from 'express-validator';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import prisma from '../utils/db';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { Role } from '../types/Role';
import { auditLog } from '../middleware/auditLog';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get skill groups for intake
router.get('/groups/intake/:intakeId', async (req: AuthRequest, res) => {
  try {
    const { intakeId } = req.params;

    // Check access
    const hasAccess = await checkIntakeAccess(req.user!, intakeId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const skillGroups = await prisma.skillGroup.findMany({
      where: { intakeId },
      include: {
        skills: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(skillGroups);
  } catch (error) {
    console.error('Get skill groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single skill group
router.get('/groups/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const skillGroup = await prisma.skillGroup.findUnique({
      where: { id },
      include: {
        skills: {
          orderBy: { name: 'asc' },
        },
        intake: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!skillGroup) {
      return res.status(404).json({ error: 'Skill group not found' });
    }

    // Check access
    const hasAccess = await checkIntakeAccess(req.user!, skillGroup.intakeId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(skillGroup);
  } catch (error) {
    console.error('Get skill group error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create skill group (Admin or Manager)
router.post(
  '/groups',
  authorize('ADMIN', 'MANAGER'),
  [
    body('intakeId').notEmpty().withMessage('Intake ID is required'),
    body('name').notEmpty().withMessage('Name is required'),
  ],
  auditLog('CREATE_SKILL_GROUP', 'SkillGroup'),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { intakeId, name, description } = req.body;

      // Check access
      const intake = await prisma.intake.findUnique({
        where: { id: intakeId },
      });

      if (!intake) {
        return res.status(404).json({ error: 'Intake not found' });
      }

      if (req.user!.role !== 'ADMIN' && intake.createdBy !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const skillGroup = await prisma.skillGroup.create({
        data: {
          intakeId,
          name,
          description: description || null,
        },
        include: {
          skills: true,
        },
      });

      res.status(201).json(skillGroup);
    } catch (error) {
      console.error('Create skill group error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update skill group (Admin or Manager)
router.patch(
  '/groups/:id',
  authorize('ADMIN', 'MANAGER'),
  auditLog('UPDATE_SKILL_GROUP', 'SkillGroup', (req) => req.params.id),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const skillGroup = await prisma.skillGroup.findUnique({
        where: { id },
        include: {
          intake: true,
        },
      });

      if (!skillGroup) {
        return res.status(404).json({ error: 'Intake not found' });
      }

      if (req.user!.role !== 'ADMIN' && skillGroup.intake.createdBy !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const oldSkillGroup = { ...skillGroup };

      const updatedSkillGroup = await prisma.skillGroup.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
        },
        include: {
          skills: true,
        },
      });

      // Log update
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE_SKILL_GROUP',
          entityType: 'SkillGroup',
          entityId: id,
          oldValue: JSON.stringify(oldSkillGroup),
          newValue: JSON.stringify(updatedSkillGroup),
        },
      });

      res.json(updatedSkillGroup);
    } catch (error) {
      console.error('Update skill group error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete skill group (Admin or Manager)
router.delete(
  '/groups/:id',
  authorize('ADMIN', 'MANAGER'),
  auditLog('DELETE_SKILL_GROUP', 'SkillGroup', (req) => req.params.id),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const skillGroup = await prisma.skillGroup.findUnique({
        where: { id },
        include: {
          intake: true,
        },
      });

      if (!skillGroup) {
        return res.status(404).json({ error: 'Skill group not found' });
      }

      if (req.user!.role !== 'ADMIN' && skillGroup.intake.createdBy !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await prisma.skillGroup.delete({
        where: { id },
      });

      res.json({ message: 'Skill group deleted successfully' });
    } catch (error) {
      console.error('Delete skill group error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Create skill (Admin or Manager)
router.post(
  '/',
  authorize('ADMIN', 'MANAGER'),
  [
    body('skillGroupId').notEmpty().withMessage('Skill group ID is required'),
    body('name').notEmpty().withMessage('Name is required'),
  ],
  auditLog('CREATE_SKILL', 'Skill'),
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { skillGroupId, name, description } = req.body;

      // Check access
      const skillGroup = await prisma.skillGroup.findUnique({
        where: { id: skillGroupId },
        include: {
          intake: true,
        },
      });

      if (!skillGroup) {
        return res.status(404).json({ error: 'Skill group not found' });
      }

      if (req.user!.role !== 'ADMIN' && skillGroup.intake.createdBy !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const skill = await prisma.skill.create({
        data: {
          skillGroupId,
          name,
          description: description || null,
        },
      });

      res.status(201).json(skill);
    } catch (error) {
      console.error('Create skill error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Update skill (Admin or Manager)
router.patch(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  auditLog('UPDATE_SKILL', 'Skill', (req) => req.params.id),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { name, description } = req.body;

      const skill = await prisma.skill.findUnique({
        where: { id },
        include: {
          skillGroup: {
            include: {
              intake: true,
            },
          },
        },
      });

      if (!skill) {
        return res.status(404).json({ error: 'Skill not found' });
      }

      if (req.user!.role !== 'ADMIN' && skill.skillGroup.intake.createdBy !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const oldSkill = { ...skill };

      const updatedSkill = await prisma.skill.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
        },
      });

      // Log update
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'UPDATE_SKILL',
          entityType: 'Skill',
          entityId: id,
          oldValue: JSON.stringify(oldSkill),
          newValue: JSON.stringify(updatedSkill),
        },
      });

      res.json(updatedSkill);
    } catch (error) {
      console.error('Update skill error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Delete skill (Admin or Manager)
router.delete(
  '/:id',
  authorize('ADMIN', 'MANAGER'),
  auditLog('DELETE_SKILL', 'Skill', (req) => req.params.id),
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;

      const skill = await prisma.skill.findUnique({
        where: { id },
        include: {
          skillGroup: {
            include: {
              intake: true,
            },
          },
        },
      });

      if (!skill) {
        return res.status(404).json({ error: 'Skill not found' });
      }

      if (req.user!.role !== 'ADMIN' && skill.skillGroup.intake.createdBy !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      await prisma.skill.delete({
        where: { id },
      });

      res.json({ message: 'Skill deleted successfully' });
    } catch (error) {
      console.error('Delete skill error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Export skill groups to CSV
router.get('/groups/intake/:intakeId/export', async (req: AuthRequest, res) => {
  try {
    const { intakeId } = req.params;

    // Check access
    const hasAccess = await checkIntakeAccess(req.user!, intakeId);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const skillGroups = await prisma.skillGroup.findMany({
      where: { intakeId },
      include: {
        skills: {
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    const csvData = [];
    csvData.push(['Skill Group', 'Skill Name', 'Skill Description']);

    for (const group of skillGroups) {
      if (group.skills.length === 0) {
        csvData.push([group.name, '', group.description || '']);
      } else {
        for (const skill of group.skills) {
          csvData.push([
            group.name,
            skill.name,
            skill.description || '',
          ]);
        }
      }
    }

    const csv = stringify(csvData);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="skill-groups-${intakeId}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export skill groups error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Import skill groups from CSV
router.post(
  '/groups/intake/:intakeId/import',
  authorize('ADMIN', 'MANAGER'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { intakeId } = req.params;
      const { csv, dryRun } = req.body;

      if (!csv) {
        return res.status(400).json({ error: 'CSV data is required' });
      }

      // Check access
      const intake = await prisma.intake.findUnique({
        where: { id: intakeId },
      });

      if (!intake) {
        return res.status(404).json({ error: 'Intake not found' });
      }

      if (req.user!.role !== 'ADMIN' && intake.createdBy !== req.user!.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const records = parse(csv, {
        columns: true,
        skip_empty_lines: true,
      });

      const results: any[] = [];
      const errors: any[] = [];

      if (!dryRun) {
        // Process in transaction
        for (const record of records) {
          try {
            const skillGroupName = record['Skill Group'] || record['skill_group'];
            const skillName = record['Skill Name'] || record['skill_name'];
            const skillDescription = record['Skill Description'] || record['skill_description'] || '';

            if (!skillGroupName) {
              errors.push({ row: record, error: 'Skill Group name is required' });
              continue;
            }

            // Find or create skill group
            let skillGroup = await prisma.skillGroup.findFirst({
              where: {
                intakeId,
                name: skillGroupName,
              },
            });

            if (!skillGroup) {
              skillGroup = await prisma.skillGroup.create({
                data: {
                  intakeId,
                  name: skillGroupName,
                },
              });
            }

            // Create skill if name provided
            if (skillName) {
              // Check if skill exists
              const existingSkill = await prisma.skill.findFirst({
                where: {
                  skillGroupId: skillGroup.id,
                  name: skillName,
                },
              });

              if (existingSkill) {
                // Update existing skill
                await prisma.skill.update({
                  where: { id: existingSkill.id },
                  data: {
                    description: skillDescription || null,
                  },
                });
              } else {
                // Create new skill
                await prisma.skill.create({
                  data: {
                    skillGroupId: skillGroup.id,
                    name: skillName,
                    description: skillDescription || null,
                  },
                });
              }
            }

            results.push({ row: record, status: 'success' });
          } catch (error: any) {
            errors.push({ row: record, error: error.message });
          }
        }
      } else {
        // Dry run - just validate
        for (const record of records) {
          const skillGroupName = record['Skill Group'] || record['skill_group'];
          if (!skillGroupName) {
            errors.push({ row: record, error: 'Skill Group name is required' });
          } else {
            results.push({ row: record, status: 'valid' });
          }
        }
      }

      res.json({
        success: results.length,
        errors: errors.length,
        results,
        errorsList: errors,
      });
    } catch (error) {
      console.error('Import skill groups error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Helper function to check intake access
async function checkIntakeAccess(user: { id: string; role: Role }, intakeId: string): Promise<boolean> {
  if (user.role === 'ADMIN') {
    return true;
  }

  const intake = await prisma.intake.findUnique({
    where: { id: intakeId },
  });

  if (!intake) {
    return false;
  }

  if (user.role === 'MANAGER' && intake.createdBy === user.id) {
    return true;
  }

  if (user.role === 'TRAINER') {
    const hasSession = await prisma.trainingSession.findFirst({
      where: {
        intakeId,
        trainerId: user.id,
      },
    });
    if (hasSession) return true;
  }

  if (user.role === 'TRAINEE') {
    const membership = await prisma.intakeMember.findUnique({
      where: {
        intakeId_userId: {
          intakeId,
          userId: user.id,
        },
      },
    });
    if (membership) return true;
  }

  return false;
}

export default router;

