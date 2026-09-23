import { NextResponse, type NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { callGas, PUBLIC_TAG } from '@/lib/server/gas';
import { getClientIp, SESSION_COOKIE, ROLE_HINT_COOKIE } from '@/lib/server/session';

/**
 * Backend-for-frontend proxy used by the student and admin portals.
 * - attaches the session token from the httpOnly cookie (JS never sees it)
 * - adds the server-only API_PROXY_SECRET and the client IP (for rate limits)
 * - refreshes cached public pages after any successful write
 * Authorisation is enforced by Apps Script for every action.
 */

const BLOCKED = new Set(['register', 'login', 'adminLogin', 'googleLogin', 'logout', 'paymentWebhook', 'runSetup']);
const READ_ONLY = /^(admin\.)?(get|list|search|me$|verify|download|export)/;

export async function POST(req: NextRequest) {
  let body: { action?: unknown; payload?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'BAD_REQUEST', message: 'Invalid request.' }, { status: 400 });
  }
  const action = typeof body.action === 'string' ? body.action : '';
  if (!/^[A-Za-z.]{2,60}$/.test(action) || BLOCKED.has(action)) {
    return NextResponse.json({ success: false, error: 'UNKNOWN_ACTION', message: 'Unknown action.' }, { status: 404 });
  }
  const payload = body.payload && typeof body.payload === 'object' && !Array.isArray(body.payload) ? (body.payload as Record<string, unknown>) : {};
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const result = await callGas(action, payload, { token, clientIp: await getClientIp(), timeoutMs: 60000 });

  if (result.success && !READ_ONLY.test(action)) revalidateTag(PUBLIC_TAG, { expire: 0 });

  const res = NextResponse.json(result, { headers: { 'Cache-Control': 'no-store' } });
  if (!result.success && result.error === 'UNAUTHORIZED' && token) {
    res.cookies.delete(SESSION_COOKIE);
    res.cookies.delete(ROLE_HINT_COOKIE);
  }
  return res;
}
