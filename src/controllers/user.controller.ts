import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { assignPermissionSchema } from '../utils/validation';

const prisma = new PrismaClient();

// Only ADMIN can call this
export const grantPermission = async (req: Request, res: Response) => {
    try {
        const { targetUserId, permissionKey } = assignPermissionSchema.parse(req.body);
        const adminId = (req as any).user.id;

        // Check if user exists
        const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
        if (!targetUser) return res.status(404).json({ error: 'User not found' });

        // Grant Permission
        const newPermission = await prisma.permission.create({
            data: {
                userId: targetUserId,
                permissionKey: permissionKey,
                grantedBy: adminId,
            },
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                actorId: adminId,
                action: 'GRANT_PERMISSION',
                targetTable: 'permissions',
                targetId: newPermission.id,
                details: { permissionKey, targetUserId },
            },
        });

        res.status(201).json({ message: `Permission ${permissionKey} granted to user`, permission: newPermission });
    } catch (error) {
        res.status(500).json({ error: 'Failed to grant permission', details: error });
    }
};
