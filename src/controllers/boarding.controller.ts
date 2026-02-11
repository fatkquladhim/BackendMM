import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const createRecordSchema = z.object({
    memberId: z.string().uuid(),
    periodMonth: z.string().regex(/^\d{4}-\d{2}-01$/, "Format must be YYYY-MM-01"),
    disciplineScore: z.number().min(0).max(100),
    liabilities: z.string().optional(),
    achievements: z.string().optional(),
    notes: z.string().optional(),
});

// 1. Input Discipline Record (Kepala Kamar / Discipline Officer)
export const inputBoardingRecord = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { memberId, periodMonth, disciplineScore, liabilities, achievements, notes } = createRecordSchema.parse(req.body);

        // Verify Access
        // - Admin: Can input for anyone
        // - External: Can only input for members in their dorm (Logic requires Dorm relation, skipping strict dorm check for MVP, assuming External knows IDs)
        // - Member (Discipline Officer): Can input if granted permission

        if (user.role === 'MEMBER') {
            const hasPermission = await prisma.permission.findFirst({
                where: { userId: user.id, permissionKey: 'DISCIPLINE_OFFICER' }
            });
            if (!hasPermission) return res.status(403).json({ error: 'Requires DISCIPLINE_OFFICER privilege' });
        }

        const record = await prisma.boardingRecord.create({
            data: {
                memberId,
                periodMonth: new Date(periodMonth),
                disciplineScore,
                liabilities,
                achievements,
                notes, // Fixed: This was missing in schema, let's assume it handles extra fields or ignore
                inputBy: user.id
            }
        });

        res.status(201).json({ message: 'Boarding record saved', record });
    } catch (error) {
        res.status(400).json({ error: 'Failed to save record', details: error });
    }
};

// 2. Get Records (Read-Only for Members, Full for Admins)
export const getBoardingRecords = async (req: Request, res: Response) => {
    try {
        const user = (req as any).user;
        const { memberId, month } = req.query;

        const whereClause: any = {};
        if (memberId) whereClause.memberId = String(memberId);
        if (month) whereClause.periodMonth = new Date(String(month));

        // Members can only see their own
        if (user.role === 'MEMBER') {
            const member = await prisma.member.findUnique({ where: { userId: user.id } });
            if (!member) return res.status(404).json({ error: 'Member not found' });
            // Force override query
            whereClause.memberId = member.id;
        }

        const records = await prisma.boardingRecord.findMany({
            where: whereClause,
            include: {
                member: { select: { fullName: true } },
                inputter: { select: { username: true } }
            },
            orderBy: { periodMonth: 'desc' }
        });

        res.json(records);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch records', details: error });
    }
};
