import { NextResponse } from 'next/server';

// Defense-in-depth CSRF guard for state-changing API routes. The sameSite=lax
// auth cookie already blocks the worst cross-site requests; this adds an explicit
// same-origin check. Returns a 403 NextResponse to short-circuit, or null to proceed.
export function assertSameOrigin(request: Request): NextResponse | null {
  const host = request.headers.get('host');
  // Prefer Origin; fall back to Referer. Browsers send Origin on every
  // POST/PATCH/DELETE, so a same-origin app fetch always satisfies this.
  const source = request.headers.get('origin') ?? request.headers.get('referer');

  if (!host || !source) return forbidden();

  let sourceHost: string;
  try {
    sourceHost = new URL(source).host;
  } catch {
    return forbidden();
  }

  return sourceHost === host ? null : forbidden();
}

function forbidden() {
  return NextResponse.json({ error: 'Invalid request origin' }, { status: 403 });
}
