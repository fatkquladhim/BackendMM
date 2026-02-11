import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { registerSchema, loginSchema } from '../utils/validation';

const prisma = new PrismaClient();

const generateTokens = (user: any) => {
    const accessToken = jwt.sign(
        { id: user.id, role: user.role, username: user.username },
        process.env.JWT_SECRET as string,
        { expiresIn: '15m' }
    );
    const refreshToken = jwt.sign(
        { id: user.id },
        process.env.JWT_REFRESH_SECRET as string,
        { expiresIn: '7d' }
    );
    return { accessToken, refreshToken };
};

export const register = async (req: Request, res: Response) => {
    try {
        const validatedData = registerSchema.parse(req.body);
        const existingUser = await prisma.user.findUnique({ where: { username: validatedData.username } });

        if (existingUser) return res.status(400).json({ error: 'Username already taken' });

        const hashedPassword = await bcrypt.hash(validatedData.password, 10);
        const newUser = await prisma.user.create({
            data: {
                username: validatedData.username,
                password: hashedPassword,
                role: validatedData.role as any,
            },
        });

        res.status(201).json({ message: 'User registered successfully', userId: newUser.id });
    } catch (error) {
        res.status(400).json({ error: 'Validation Error', details: error });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { username, password } = loginSchema.parse(req.body);
        const user = await prisma.user.findUnique({ where: { username } });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const tokens = generateTokens(user);

        // Store Refresh Token in HttpOnly Cookie
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        });

        res.json({ accessToken: tokens.accessToken, role: user.role });
    } catch (error) {
        res.status(500).json({ error: 'Login Failed', details: error });
    }
};

export const logout = (req: Request, res: Response) => {
    res.clearCookie('refreshToken');
    res.json({ message: 'Logged out successfully' });
};
