import { z } from 'zod';

export const registerSchema = z.object({
    username: z.string().min(4),
    password: z.string().min(6),
    role: z.enum(['ADMIN', 'MEMBER', 'EXTERNAL']),
});

export const loginSchema = z.object({
    username: z.string(),
    password: z.string(),
});

export const assignPermissionSchema = z.object({
    targetUserId: z.string().uuid(),
    permissionKey: z.string().min(3),
});
