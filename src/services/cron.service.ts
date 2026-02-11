import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const calculateGrade = (score: number) => {
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'E';
};

export const initCronJobs = () => {
    // Run on the 1st of every month at 00:00
    cron.schedule('0 0 1 * *', async () => {
        console.log('Running Monthly Grading Job...');

        const members = await prisma.member.findMany({ where: { status: 'ACTIVE' } });
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const nextMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        for (const member of members) {
            // 1. Calculate Task Score (Average of completed tasks in last month)
            // Simplified: Logic needs refining based on "All Daily Tasks" denominator, 
            // but for MVP let's assume if they miss tasks, they don't exist, so we penalize missing tasks 
            // by not finding them. Actually, easier:
            // Score = (Completed / Total Required) * 100.
            // For MVP, we'll placeholder this as "Inputted by Admin" or "Assumed 100 if no feedback"?
            // Let's stick to the Plan: "MultimediaTaskScore".
            // Let's grab all tasks from last month
            const tasks = await prisma.task.findMany({
                where: {
                    memberId: member.id,
                    deadline: {
                        gte: lastMonth,
                        lt: nextMonth
                    }
                }
            });

            let taskScore = 0;
            if (tasks.length > 0) {
                const completed = tasks.filter(t => t.status === 'COMPLETED').length;
                taskScore = (completed / tasks.length) * 100;
            } else {
                taskScore = 0; // No tasks submitted = 0? Or 100 if no tasks assigned? Let's assume 0 for now.
            }

            // 2. Get Boarding Score
            // Find record for last month (e.g., if now is Feb 1st, look for Jan 1st record)
            const boardRecord = await prisma.boardingRecord.findFirst({
                where: {
                    memberId: member.id,
                    periodMonth: lastMonth
                }
            });
            const boardingScore = boardRecord ? boardRecord.disciplineScore : 100; // Default 100 if no bad news? Or 0? Let's say 100 default discipline.

            // 3. Final Calc
            let finalScore = (taskScore * 0.6) + (boardingScore * 0.4);

            // 4. SP Check
            if (member.status === 'SP1' || member.status === 'SP2') {
                finalScore = Math.min(finalScore, 50);
            }

            const newGrade = calculateGrade(finalScore);

            // 5. Update Member
            await prisma.member.update({
                where: { id: member.id },
                data: { currentGrade: newGrade as any }
            });

            console.log(`Updated ${member.fullName}: Score ${finalScore.toFixed(2)} -> Grade ${newGrade}`);
        }

        console.log('Monthly Grading Complete.');
    });
};
