import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const authOnlyPages = ['/login', '/signup'];

const alwaysPublic = [
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/check-email',
    '/privacy',
    '/waitlist',
];

export function proxy(request: NextRequest) {
    const token = request.cookies.get('token');
    const { pathname } = request.nextUrl;

    if (alwaysPublic.includes(pathname)) {
        return NextResponse.next();
    }

    const isAuthOnlyPage = authOnlyPages.includes(pathname);

    if (!token && !isAuthOnlyPage) {
        return NextResponse.redirect(new URL('/login', request.url));
    }
    if (token && isAuthOnlyPage) {
        return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
