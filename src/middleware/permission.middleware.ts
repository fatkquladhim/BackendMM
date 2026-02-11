import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Interface extension to include user from AuthMiddleware
interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
    };
}

export const requirePermission = (permissionKey: string) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            const user = req.user;
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // 1. Super Admin always bypasses
            if (user.role === 'ADMIN') {
                return next();
            }

            // 2. Check Granular Permission in DB
            const hasPermission = await prisma.permission.findFirst({
                where: {
                    userId: user.id,
                    permissionKey: permissionKey,
                },
            });

            if (!hasPermission) {
                return res.status(403).json({ error: `Forbidden: Requires ${permissionKey} privilege` });
            }

            next();
        } catch (error) {
            console.error('Permission Check Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    };
};
