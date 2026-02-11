import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

// Validation Schemas
const createTaskSchema = z.object({
    title: z.string().min(5),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY']),
    deadline: z.string().transform((str) => new Date(str)),
    constraints: z.string(),
    solutions: z.string(),
    proofLink: z.string().url().optional(),
});

const verifyTaskSchema = z.object({
    action: z.enum(['APPROVE', 'REJECT']),
    notes: z.string().optional(), // For rejection reasons or praise
});

// --- Handlers ---

// 1. Create Task (Member)
export const createTask = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const body = createTaskSchema.parse(req.body);

        // Ensure user has a Member profile
        const member = await prisma.member.findUnique({ where: { userId: user.id } });
        if (!member) return res.status(404).json({ error: 'Member profile not found' });

        const task = await prisma.task.create({
            data: {
                memberId: member.id,
                title: body.title,
                frequency: body.frequency,
                deadline: body.deadline,
                constraints: body.constraints,
                solutions: body.solutions,
                proofLink: body.proofLink,
                status: 'PENDING',
            },
        });

        res.status(201).json(task);
    } catch (error) {
        res.status(400).json({ error: 'Failed to create task', details: error });
    }
};

// 2. Get Tasks (Filterable)
export const getTasks = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { status, memberId } = req.query;

        const whereClause: any = {};

        // Filter by Status
        if (status) whereClause.status = String(status);

        // Access Control
        // - Members can only see their own tasks
        // - Admins/Verifiers can see all (or filter by specific member)
        if (user.role === 'MEMBER') {
            // Check if they have verifier permission?
            const isVerifier = await prisma.permission.findFirst({
                where: { userId: user.id, permissionKey: 'TASK_VERIFIER' }
            });

            if (!isVerifier) {
                // Regular member: force filter by their own memberId
                const member = await prisma.member.findUnique({ where: { userId: user.id } });
                if (!member) return res.status(404).json({ error: 'Member profile not found' });
                whereClause.memberId = member.id;
            } else {
                // Verifier: can filter by specific member if provided
                if (memberId) whereClause.memberId = String(memberId);
            }
        } else {
            // Admin/External
            if (memberId) whereClause.memberId = String(memberId);
        }

        const tasks = await prisma.task.findMany({
            where: whereClause,
            include: { member: { select: { fullName: true, division: true } } }, // Join for context
            orderBy: { deadline: 'asc' },
        });

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch tasks', details: error });
    }
};

// 3. Verify Task (Admin / Delegated)
// Protected by 'TASK_VERIFIER' permission via middleware
export const verifyTask = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { action } = verifyTaskSchema.parse(req.body);
        const verifierId = (req as any).user.id;

        const task = await prisma.task.findUnique({ where: { id } });
        if (!task) return res.status(404).json({ error: 'Task not found' });

        const newStatus = action === 'APPROVE' ? 'COMPLETED' : 'REJECTED';

        const updatedTask = await prisma.task.update({
            where: { id },
            data: {
                status: newStatus,
                verifiedBy: verifierId,
                verifiedAt: new Date(),
            },
        });

        // Audit Log
        await prisma.auditLog.create({
            data: {
                actorId: verifierId,
                action: 'VERIFY_TASK',
                targetTable: 'tasks',
                targetId: task.id,
                details: { oldStatus: task.status, newStatus, action },
            },
        });

        res.json({ message: `Task ${newStatus}`, task: updatedTask });
    } catch (error) {
        res.status(500).json({ error: 'Failed to verify task', details: error });
    }
};
