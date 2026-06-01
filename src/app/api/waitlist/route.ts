import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { prisma } from '@/lib/prisma';
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
// from a single source. Mirrors the DB-backed, per-actor approach used for login
// lockout rather than introducing new infra. Tune these two constants to taste.
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_MAX = 10; // submissions per IP per window

// Hash the IP with a salt so no raw IP (PII) is ever stored. Reuses JWT_SECRET
// as the salt to avoid adding a new env var.
function hashIp(ip: string): string {
    return createHash('sha256').update(`${process.env.JWT_SECRET ?? ''}:${ip}`).digest('hex');
}

function getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    if (forwarded) return forwarded.split(',')[0].trim();
    return request.headers.get('x-real-ip')?.trim() || 'unknown';
}

// Returns true if this IP has exhausted its window. Resets the counter when the
// existing window has elapsed; otherwise increments it.
async function isRateLimited(ipHash: string): Promise<boolean> {
    const now = new Date();
    const existing = await prisma.waitlistRateLimit.findUnique({ where: { ipHash } });

    if (!existing || now.getTime() - existing.windowStart.getTime() > RATE_WINDOW_MS) {
        await prisma.waitlistRateLimit.upsert({
            where: { ipHash },
            create: { ipHash, count: 1, windowStart: now },
            update: { count: 1, windowStart: now },
        });
        return false;
    }

    if (existing.count >= RATE_MAX) return true;

    await prisma.waitlistRateLimit.update({
        where: { ipHash },
        data: { count: { increment: 1 } },
    });
    return false;
}

export async function POST(request: Request) {
    try {
        const ipHash = hashIp(getClientIp(request));
        if (await isRateLimited(ipHash)) {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 },
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
