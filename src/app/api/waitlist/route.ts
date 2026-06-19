import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin } from '@/lib/csrf';
import { checkRateLimit, getClientIp, hashIdentifier } from '@/lib/rate-limit';
import { z } from 'zod';

// Public, unauthenticated capture endpoint. Email + optional name/note only.
// No sensitive recovery data is collected here.
const waitlistSchema = z.object({
    email: z.email().max(255),
    firstName: z.string().min(1).max(100).optional(),
    note: z.string().min(1).max(1000).optional(),
});

// Per-IP fixed-window rate limit. Permissive enough for a real person (and a
// shared/NAT network where several people sign up at once) but stops bulk spam
// from a single source. Tune these two constants to taste.
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 10; // submissions per IP per window

export async function POST(request: Request) {
    try {
        const csrf = assertSameOrigin(request);
        if (csrf) return csrf;

        const key = `waitlist:${hashIdentifier(getClientIp(request))}`;
        const { limited, retryAfterSeconds } = await checkRateLimit(key, {
            windowMs: RATE_WINDOW_MS,
            max: RATE_MAX,
        });
        if (limited) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } },
            );
        }

        const body = await request.json();
        const parsed = waitlistSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
        }

        const email = parsed.data.email.trim().toLowerCase();
        const firstName = parsed.data.firstName?.trim() || undefined;
        const note = parsed.data.note?.trim() || undefined;

        try {
            await prisma.waitlist.create({ data: { email, firstName, note } });
            return NextResponse.json({ status: 'added' }, { status: 201 });
        } catch (error: unknown) {
            // Duplicate email: already on the list. Treat as success, don't leak.
            if (
                typeof error === 'object' &&
                error !== null &&
                'code' in error &&
                (error as { code: string }).code === 'P2002'
            ) {
                return NextResponse.json({ status: 'already' });
            }
            throw error;
        }
    } catch (error) {
        console.error('waitlist POST failed', {
            name: error instanceof Error ? error.name : 'Unknown',
        });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
