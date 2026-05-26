import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicPaths = ['/login', '/signup'];

export function proxy(request: NextRequest) {
    const token = request.cookies.get('token');
    const { pathname } = request.nextUrl;
    const isPublic = publicPaths.includes(pathname);

    if (!token && !isPublic) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    if (token && isPublic) {
        return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
