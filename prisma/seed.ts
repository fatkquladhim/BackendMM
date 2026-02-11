import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const password = await bcrypt.hash('password', 10);

    // 1. Create Super Admin
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            username: 'admin',
            password,
            role: 'ADMIN',
        },
    });
    console.log({ admin });

    // 2. Create Member User & Profile
    const memberUser = await prisma.user.upsert({
        where: { username: 'member' },
        update: {},
        create: {
            username: 'member',
            password,
            role: 'MEMBER',
        },
    });

    const memberProfile = await prisma.member.upsert({
        where: { userId: memberUser.id },
        update: {},
        create: {
            userId: memberUser.id,
            fullName: 'Ahmad Santri',
            division: 'Video Editing',
            status: 'ACTIVE',
            joinDate: new Date(),
        },
    });
    console.log({ memberUser, memberProfile });

    // 3. Create External User (Kepala Kamar)
    const external = await prisma.user.upsert({
        where: { username: 'external' },
        update: {},
        create: {
            username: 'external',
            password,
            role: 'EXTERNAL',
        },
    });
    console.log({ external });

    // 4. Grant Privilege (Demonstration)
    // Give 'TASK_VERIFIER' to the Member so they can verify others' tasks (if needed)
    // or just to show the feature.
    await prisma.permission.create({
        data: {
            userId: memberUser.id,
            permissionKey: 'TASK_VERIFIER',
            grantedBy: admin.id,
        }
    });

    console.log('Seeding finished.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
