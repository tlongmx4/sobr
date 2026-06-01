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

// Public production domains are locked to the waitlist for now. The full app
// (login, signup, dashboard, chat) stays reachable on the Vercel deployment URL
// and on localhost so testing can continue; access to the real product is
// granted to testers manually. To open the app to the public, empty this set.
const waitlistOnlyHosts = new Set([
    'sobrandsteady.com',
    'www.sobrandsteady.com',
    'sobrandsteady.app',
    'www.sobrandsteady.app',
]);

export function proxy(request: NextRequest) {
    const token = request.cookies.get('token');
    const { pathname } = request.nextUrl;

    const host = (request.headers.get('host') ?? '').toLowerCase().split(':')[0];
    if (waitlistOnlyHosts.has(host) && pathname !== '/waitlist') {
        return NextResponse.redirect(new URL('/waitlist', request.url));
    }

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
