import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { assertSameOrigin } from '@/lib/csrf';

export async function POST(request: Request) {
  const csrf = assertSameOrigin(request);
  if (csrf) return csrf;

  (await cookies()).delete('token');
  return NextResponse.json({ success: true });
}
