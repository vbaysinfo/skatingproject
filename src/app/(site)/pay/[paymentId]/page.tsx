import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/server/session';
import { PaymentFlow } from './PaymentFlow';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Payment', robots: { index: false } };

export default async function PayPage({ params, searchParams }: { params: Promise<{ paymentId: string }>; searchParams: Promise<{ next?: string }> }) {
  const { paymentId } = await params;
  const { next } = await searchParams;
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard/registrations';
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/pay/${paymentId}?next=${encodeURIComponent(safeNext)}`)}`);
  return <PaymentFlow paymentId={paymentId} next={safeNext} />;
}
