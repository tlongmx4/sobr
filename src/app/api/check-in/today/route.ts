import { NextResponse } from 'next/server';
import { getCurrentUserId } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
    const userId = await getCurrentUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const existingCheckIn = await prisma.checkIn.findFirst({
        where: {
            userId,
            createdAt: {
                gte: startOfToday,
            },
        },
        select: { id: true },
    });

    return NextResponse.json({
        hasCheckedInToday: existingCheckIn !== null
    });
}