import { NextResponse, type NextRequest } from 'next/server';

/**
 * Optimistic redirect for portal pages when no session cookie exists.
 * This is only a UX shortcut — real authorisation happens in Apps Script
 * for every request (and the portal layouts re-validate the session).
 */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const hasSession = req.cookies.has('sa_session');
  if (hasSession) return NextResponse.next();
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    return NextResponse.redirect(new URL(`/admin/login?next=${encodeURIComponent(pathname + search)}`, req.url));
  }
  if (pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname + search)}`, req.url));
  }
  return NextResponse.next();
}

export const config = { matcher: ['/admin/:path*', '/dashboard/:path*'] };
