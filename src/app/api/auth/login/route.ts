import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { assertSameOrigin } from '@/lib/csrf';
import { DUMMY_PASSWORD_HASH } from '@/lib/passwords';
import 'dotenv/config';

const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const csrf = assertSameOrigin(request);
    if (csrf) return csrf;

    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Run a comparison against a dummy hash so a missing account takes the same
      // time as a wrong password, closing the timing-based enumeration channel.
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      const retryAfterSeconds = Math.ceil(
        (user.lockedUntil.getTime() - now.getTime()) / 1000
      );
      return NextResponse.json(
        {
          error: 'Too many failed attempts. Try again in a few minutes.',
          code: 'LOCKED',
          retryAfter: retryAfterSeconds,
        },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfterSeconds) },
        }
      );
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordCorrect) {
      const nextAttempts = user.failedLoginAttempts + 1;
      const shouldLock = nextAttempts >= MAX_FAILED_ATTEMPTS;
      await prisma.user.update({
        where: { id: user.id },
        data: shouldLock
          ? {
              failedLoginAttempts: 0,
              lockedUntil: new Date(now.getTime() + LOCK_DURATION_MS),
            }
          : { failedLoginAttempts: nextAttempts },
      });
      if (shouldLock) {
        return NextResponse.json(
          {
            error: 'Too many failed attempts. Try again in 15 minutes.',
            code: 'LOCKED',
            retryAfter: Math.ceil(LOCK_DURATION_MS / 1000),
          },
          {
            status: 429,
            headers: { 'Retry-After': String(LOCK_DURATION_MS / 1000) },
          }
        );
      }
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      return NextResponse.json(
        {
          error: 'Please verify your email before logging in.',
          code: 'EMAIL_NOT_VERIFIED',
        },
        { status: 403 }
      );
    }

    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    (await cookies()).set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: SEVEN_DAYS_SECONDS,
    });

    return NextResponse.json(
      {
        message: 'Login successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('login failed', {
      name: error instanceof Error ? error.name : 'Unknown',
      code: (error as { code?: string })?.code,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
