import { NextResponse, type NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';
import { callGas, PUBLIC_TAG } from '@/lib/server/gas';

/**
 * Razorpay webhook receiver. Apps Script cannot read request headers, so the
 * raw body and X-Razorpay-Signature are forwarded and the HMAC is verified
 * inside Apps Script with the webhook secret.
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature') || '';
  if (!signature || rawBody.length > 1_000_000) return NextResponse.json({ ok: false }, { status: 400 });
  const r = await callGas('paymentWebhook', { rawBody, signature });
  if (r.success) revalidateTag(PUBLIC_TAG, { expire: 0 });
  return NextResponse.json({ ok: r.success }, { status: r.success ? 200 : r.error === 'FORBIDDEN' ? 401 : 500 });
}
