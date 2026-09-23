import { NextResponse, type NextRequest } from 'next/server';
import { callGas } from '@/lib/server/gas';
import { getClientIp, sessionCookieOptions, SESSION_COOKIE, ROLE_HINT_COOKIE } from '@/lib/server/session';
import type { SessionUser } from '@/lib/types';

/** Login / registration endpoints: the session token is stored only in an httpOnly cookie. */
const ACTIONS: Record<string, string> = {
  login: 'login',
  'admin-login': 'adminLogin',
  register: 'register',
  google: 'googleLogin',
  logout: 'logout',
};

type SessionResult = { token: string; expiresAt: string; user: SessionUser };

export async function POST(req: NextRequest, ctx: RouteContext<'/api/auth/[action]'>) {
  const { action } = await ctx.params;
  const gasAction = ACTIONS[action];
  if (!gasAction) return NextResponse.json({ success: false, error: 'UNKNOWN_ACTION', message: 'Unknown action.' }, { status: 404 });
  const payload = action === 'logout' ? {} : await req.json().catch(() => ({}));
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const clientIp = await getClientIp();

  if (action === 'logout') {
    if (token) await callGas('logout', {}, { token, clientIp });
    const res = NextResponse.json({ success: true, data: { loggedOut: true } });
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(ROLE_HINT_COOKIE);
    return res;
  }

  const result = await callGas<SessionResult>(gasAction, payload, { clientIp });
  if (!result.success) return NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  const { token: newToken, expiresAt, user } = result.data;
  const res = NextResponse.json({ success: true, data: { user } }, { headers: { 'Cache-Control': 'no-store' } });
  res.cookies.set(SESSION_COOKIE, newToken, sessionCookieOptions(expiresAt));
  res.cookies.set(ROLE_HINT_COOKIE, user.role, { ...sessionCookieOptions(expiresAt), httpOnly: false });
  return res;
}
