import 'server-only';
import { cookies, headers } from 'next/headers';
import { callGas } from './gas';
import type { SessionUser } from '@/lib/types';

export const SESSION_COOKIE = 'sa_session';
/** Non-sensitive UI hint only. Authorisation is always decided by Apps Script. */
export const ROLE_HINT_COOKIE = 'sa_role';

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  return (h.get('x-forwarded-for') || h.get('x-real-ip') || '').split(',')[0]!.trim().slice(0, 64);
}

/** Resolves the signed-in user by asking the backend (never trusts cookies alone). */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const r = await callGas<SessionUser>('me', {}, { token, clientIp: await getClientIp() });
  return r.success ? r.data : null;
}

export function sessionCookieOptions(expiresAt?: string) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: expiresAt ? new Date(expiresAt) : undefined,
  };
}
