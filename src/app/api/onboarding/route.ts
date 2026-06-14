import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { assertSameOrigin } from '@/lib/csrf';
import { DISCLAIMER_VERSION } from '@/lib/onboarding';
import { z } from 'zod';
import { SobrietyStatus, FrameworkPreference } from '@prisma/client';

// Field rules match updateUserSchema in src/app/api/users/route.ts.
const preferredNameSchema = z.string().min(1).max(100);
const hobbiesSchema = z.array(z.string().min(1).max(50)).max(20);
const substancesSchema = z.array(z.string().min(1).max(50)).max(10);

const onboardingSchema = z.object({
    // Blocking: onboarding cannot complete without affirmative acceptance.
    disclaimersAccepted: z.literal(true),
    preferredName: preferredNameSchema.optional(),
    hobbies: hobbiesSchema.optional(),
    substances: substancesSchema.optional(),
    sobrietyStatus: z.enum(SobrietyStatus).optional(),
    sobrietyDate: z.coerce.date().optional(),
    frameworkPreference: z.enum(FrameworkPreference).optional(),
});

export async function POST(request: Request) {
    try {
        const csrf = assertSameOrigin(request);
        if (csrf) return csrf;

        const userId = await getCurrentUserId();
        if (!userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const parsed = onboardingSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
        }

        // The server owns the completion/consent stamps; the consent flag was
        // only a gate, so drop it before writing the answers.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { disclaimersAccepted, ...answers } = parsed.data;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                ...answers,
                onboardingCompletedAt: new Date(),
                disclaimersAcceptedAt: new Date(),
                disclaimersVersion: DISCLAIMER_VERSION,
            },
            omit: { passwordHash: true },
        });

        return NextResponse.json(user);
    } catch (error) {
        console.error('onboarding POST failed', {
            name: error instanceof Error ? error.name : 'Unknown',
        });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
