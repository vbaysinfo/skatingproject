import { NextResponse, type NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { callGas, PUBLIC_TAG } from '@/lib/server/gas';
import { getClientIp } from '@/lib/server/session';

/** Setup wizard endpoints (setupStatus is public; runSetup needs the SETUP_TOKEN). */
export async function GET() {
  const r = await callGas('setupStatus', {});
  return NextResponse.json(r, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(req: NextRequest) {
  const payload = await req.json().catch(() => ({}));
  const r = await callGas('runSetup', payload, { clientIp: await getClientIp(), timeoutMs: 300000 });
  if (r.success) revalidateTag(PUBLIC_TAG, { expire: 0 });
  return NextResponse.json(r, { headers: { 'Cache-Control': 'no-store' } });
}
