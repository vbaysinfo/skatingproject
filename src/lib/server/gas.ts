import 'server-only';
import type { ApiResult } from '@/lib/types';

/**
 * Server-side client for the Google Apps Script Web App.
 *
 * The Apps Script URL and API_PROXY_SECRET never reach the browser: public
 * pages call this from server components, and the browser talks to
 * /api/gas which forwards requests with the session token from an httpOnly cookie.
 */

export const config = {
  appsScriptUrl: process.env.APPS_SCRIPT_URL || '',
  proxySecret: process.env.API_PROXY_SECRET || '',
  revalidateSeconds: Math.max(0, Number(process.env.REVALIDATE_SECONDS ?? 60)),
};

export const PUBLIC_TAG = 'public';

type CallOptions = {
  token?: string;
  clientIp?: string;
  /** Use a cacheable GET (public read actions only). */
  cacheable?: boolean;
  timeoutMs?: number;
};

const NOT_CONFIGURED: ApiResult<never> = {
  success: false,
  error: 'NOT_CONFIGURED',
  message: 'The website is not connected to its data source yet.',
};

export async function callGas<T>(action: string, payload: Record<string, unknown> = {}, opts: CallOptions = {}): Promise<ApiResult<T>> {
  if (!config.appsScriptUrl) return NOT_CONFIGURED;
  try {
    let res: Response;
    const signal = AbortSignal.timeout(opts.timeoutMs ?? 30000);
    if (opts.cacheable) {
      const url = new URL(config.appsScriptUrl);
      url.searchParams.set('action', action);
      url.searchParams.set('key', config.proxySecret);
      if (Object.keys(payload).length) url.searchParams.set('payload', JSON.stringify(payload));
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal,
        next: { revalidate: config.revalidateSeconds, tags: [PUBLIC_TAG] },
      });
    } else {
      res = await fetch(config.appsScriptUrl, {
        method: 'POST',
        // text/plain avoids a CORS preflight on Apps Script and is parsed from postData.contents.
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload, token: opts.token || undefined, key: config.proxySecret, clientIp: opts.clientIp || undefined }),
        redirect: 'follow',
        cache: 'no-store',
        signal,
      });
    }
    const text = await res.text();
    try {
      return JSON.parse(text) as ApiResult<T>;
    } catch {
      console.error(`[gas] ${action}: non-JSON response (${res.status})`, text.slice(0, 300));
      return { success: false, error: 'BAD_GATEWAY', message: 'Something went wrong. Please try again.' };
    }
  } catch (err) {
    console.error(`[gas] ${action} failed`, err);
    return { success: false, error: 'UNAVAILABLE', message: 'Something went wrong. Please try again.' };
  }
}

/** Throws-free helper returning data or null (used by public pages that render their own error state). */
export async function gasData<T>(action: string, payload: Record<string, unknown> = {}): Promise<T | null> {
  const r = await callGas<T>(action, payload, { cacheable: true });
  return r.success ? r.data : null;
}
