import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';
import bcrypt from 'bcryptjs'
import { SobrietyStatus, FrameworkPreference } from "@prisma/client";

const nameSchema = z.string().min(1).max(100);
const usernameSchema = z.string().min(3).max(30);
const emailSchema = z.email().max(255);
const passwordSchema = z.string().min(8).max(128);
const preferredNameSchema = z.string().min(1).max(100);

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

export async function POST(request: Request) {
    const body = await request.json();
    const parsed = createUserSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { password, ...rest } = parsed.data;
    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: { ...rest, passwordHash },
    });

    return NextResponse.json(user, { status: 201 });
}

export async function PATCH(request: Request) {
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
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
    }

    const { password, ...rest } = parsed.data;
    const data: Record<string, unknown> = { ...rest };

    if (password) {
        data.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({ where: { id: decoded.userId }, data });
    return NextResponse.json(user);
}

export async function DELETE(request: Request) {
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await prisma.user.delete({ where: { id: decoded.userId } });
    return NextResponse.json(user);
}
