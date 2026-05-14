import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

const moodSchema = z.number().min(1).max(5);
const energySchema = z.number().min(1).max(5);
const cravingSchema = z.number().min(1).max(5).optional();
const journalSchema = z.string().min(1).max(5000).optional();

const createCheckInSchema = z.object({
    moodRating: moodSchema,
    energyRating: energySchema,
    cravingRating: cravingSchema,
    journalEntry: journalSchema,
    });

export async function GET(request: Request) {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const checkIns = await prisma.checkIn.findMany({
        where: {
            userId: decoded.userId,
        },
        orderBy: {
            createdAt: 'desc',
        },
    });

    return NextResponse.json(checkIns);
}

export async function POST(request: Request) {
    try {
        const authHeader = request.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const decoded = verifyToken(token);
        if (!decoded) {
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = createCheckInSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
        }

        const checkIn = await prisma.checkIn.create({
            data: {
                userId: decoded.userId,
                ...parsed.data,
            },
        });

        return NextResponse.json(checkIn, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}


        