import { Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from './auth';

const prisma = new PrismaClient();

export const auditLog = (
  action: string,
  entityType: string,
  getEntityId?: (req: AuthRequest) => string | null
) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const originalSend = res.json;

    res.json = function (body: any) {
      // Log after response is sent
      if (req.user && res.statusCode < 400) {
        const entityId = getEntityId ? getEntityId(req) : req.params.id || null;
        
        prisma.auditLog
          .create({
            data: {
              userId: req.user.id,
              action,
              entityType,
              entityId: entityId || undefined,
              oldValue: req.body.oldValue ? JSON.stringify(req.body.oldValue) : undefined,
              newValue: req.body ? JSON.stringify(req.body) : undefined,
            },
          })
          .catch((err) => console.error('Audit log error:', err));
      }

      return originalSend.call(this, body);
    };

    next();
  };
};

