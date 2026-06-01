import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { getCurrentUserId } from '@/lib/auth';
import { createToken, VERIFICATION_TTL_MS } from '@/lib/tokens';
import { sendVerificationEmail } from '@/lib/email';
import { z } from 'zod';
import bcrypt from 'bcryptjs'
import { SobrietyStatus, FrameworkPreference } from "@prisma/client";

const nameSchema = z.string().min(1).max(100);
const usernameSchema = z.string().min(3).max(30);
const emailSchema = z.email().max(255);
const passwordSchema = z.string().min(8).max(128);
const inviteCodeSchema = z.string().min(1).max(100);
const preferredNameSchema = z.string().min(1).max(100);

// Thrown inside the signup transaction when the invite code is missing,
// unknown, or fully used. Rolls back the transaction so no account is created.
class InvalidInviteCodeError extends Error {}

const hobbyItemSchema = z.string().min(1).max(50);
const hobbiesSchema = z.array(hobbyItemSchema).max(20);

const substanceItemSchema = z.string().min(1).max(50);
const substancesSchema = z.array(substanceItemSchema).max(10);

const sobrietyStatusSchema = z.enum(SobrietyStatus);
const frameworkPreferenceSchema = z.enum(FrameworkPreference);
const sobrietyDateSchema = z.coerce.date();

const createUserSchema = z.object({
  name: nameSchema,
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
  inviteCode: inviteCodeSchema,
});

const updateUserSchema = z.object({
  email: emailSchema.optional(),
  name: nameSchema.optional(),
  username: usernameSchema.optional(),
  password: passwordSchema.optional(),
  preferredName: preferredNameSchema.optional(),
  hobbies: hobbiesSchema.optional(),
  substances: substancesSchema.optional(),
  sobrietyStatus: sobrietyStatusSchema.optional(),
  sobrietyDate: sobrietyDateSchema.optional(),
  frameworkPreference: frameworkPreferenceSchema.optional(),
});

export async function GET() {
    const userId = await getCurrentUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: userId },
        omit: { passwordHash: true },
    });

    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
}

export async function POST(request: Request) {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { password, inviteCode, ...rest } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 10);

    try {
        // Claim a use of the invite code and create the user in one transaction.
        // The conditional `uses < maxUses` update atomically reserves a slot, so
        // two concurrent signups can't over-spend a single-use code. If the code
        // is missing/unknown/spent, or user creation fails (duplicate email),
        // the whole transaction rolls back and no use is consumed.
        const user = await prisma.$transaction(async (tx) => {
            const claimed = await tx.inviteCode.updateMany({
                where: { code: inviteCode, uses: { lt: prisma.inviteCode.fields.maxUses } },
                data: { uses: { increment: 1 } },
            });

            if (claimed.count === 0) {
                throw new InvalidInviteCodeError();
            }

            return tx.user.create({
                data: { ...rest, passwordHash },
                omit: { passwordHash: true },
            });
        });

        try {
            const token = await createToken({
                userId: user.id,
                type: 'EMAIL_VERIFICATION',
                ttlMs: VERIFICATION_TTL_MS,
            });
            await sendVerificationEmail({
                to: user.email,
                name: user.preferredName || user.name,
                token,
            });
        } catch (emailError) {
            console.error('verification email send failed', {
                name: emailError instanceof Error ? emailError.name : 'Unknown',
            });
        }

        return NextResponse.json(
            { ...user, verificationEmailSent: true },
            { status: 201 },
        );
    } catch (error: unknown) {
        if (error instanceof InvalidInviteCodeError) {
            return NextResponse.json(
                { error: 'That invite code is invalid or has already been used.' },
                { status: 403 },
            );
        }
        if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as { code: string }).code === 'P2002'
        ) {
            const target = (error as { meta?: { target?: string[] } }).meta?.target;
            if (target?.includes('email')) {
                return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
            }
            if (target?.includes('username')) {
                return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
            }
            return NextResponse.json({ error: 'Account already exists' }, { status: 409 });
        }
        throw error;
    }
}

export async function PATCH(request: Request) {
    const userId = await getCurrentUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { password, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...rest };

    if (password) {
        data.passwordHash = await bcrypt.hash(password, 10);
    }

    try {
        const user = await prisma.user.update({
            where: { id: userId },
            data,
            omit: { passwordHash: true },
        });
        return NextResponse.json(user);
    } catch (error: unknown) {
        if (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            (error as { code: string }).code === 'P2002'
        ) {
            const target = (error as { meta?: { target?: string[] } }).meta?.target;
            if (target?.includes('email')) {
                return NextResponse.json({ error: 'Email already in use' }, { status: 409 });
            }
            if (target?.includes('username')) {
                return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
            }
            return NextResponse.json({ error: 'Account already exists' }, { status: 409 });
        }
        throw error;
    }
}

export async function DELETE() {
    const userId = await getCurrentUserId();
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.user.delete({ where: { id: userId } });
    (await cookies()).delete('token');
    return NextResponse.json({ success: true });
}
