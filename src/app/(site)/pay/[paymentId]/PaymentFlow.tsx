'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CreditCard, Landmark, ShieldCheck, CircleCheck } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatMoney, labelize } from '@/lib/format';
import { Container, Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Field, FormError, FormSuccess, Input } from '@/components/ui/Form';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/Badge';

type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
declare global {
  interface Window { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: (r: unknown) => void) => void } }
}

function loadRazorpay(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/**
 * Payment step. Success is never decided here: Apps Script verifies the
 * Razorpay signature + payment status (or an admin verifies manual payments).
 */
export function PaymentFlow({ paymentId, next }: { paymentId: string; next: string }) {
  const router = useRouter();
  const { data, error, loading } = useApi(() => api.startPayment(paymentId), [paymentId]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [reference, setReference] = useState('');

  useEffect(() => {
    if (data && data.gateway === 'NONE') router.replace(next);
  }, [data, next, router]);

  async function payOnline() {
    if (!data || data.gateway !== 'RAZORPAY') return;
    setBusy(true);
    setErr(null);
    if (!(await loadRazorpay()) || !window.Razorpay) {
      setErr('Could not load the payment window. Check your connection and try again.');
      setBusy(false);
      return;
    }
    const rzp = new window.Razorpay({
      key: data.keyId, order_id: data.orderId, amount: data.amount, currency: data.currency, name: data.name, description: data.description,
      prefill: data.prefill, theme: { color: '#1f45cf' },
      modal: { ondismiss: () => setBusy(false) },
      handler: async (resp: RazorpayResponse) => {
        try {
          await api.verifyPayment({ paymentId, ...resp });
          router.replace(next);
        } catch (e) {
          setErr(e instanceof ApiError ? e.message : 'Payment verification is pending. It will update automatically.');
          setBusy(false);
        }
      },
    });
    rzp.on('payment.failed', () => { setErr('The payment did not go through. You can try again.'); setBusy(false); });
    rzp.open();
  }

  async function submitReference() {
    setBusy(true);
    setErr(null);
    try {
      await api.submitPaymentReference(paymentId, reference);
      setMsg('Thank you! Your reference was submitted. Your registration is confirmed once the association verifies the payment.');
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface py-12 sm:py-16">
      <Container className="max-w-xl">
        <Card className="p-6 sm:p-8">
          {loading ? <LoadingState label="Preparing payment…" /> : error ? <ErrorState message={error.message} action={<ButtonLink href={next} variant="secondary">Continue</ButtonLink>} /> : data && (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-accent-600">{labelize(data.payment.type)}</p>
                  <h1 className="mt-1 font-display text-3xl font-extrabold uppercase leading-none">Payment</h1>
                  <p className="mt-2 text-sm text-muted">{data.payment.remarks}</p>
                </div>
                <StatusBadge status={data.payment.status} />
              </div>
              <div className="mt-6 flex items-end justify-between rounded-2xl bg-ink px-5 py-4 text-white">
                <span className="text-xs font-bold uppercase tracking-widest text-white/60">Amount due</span>
                <span className="font-display text-4xl font-extrabold">{formatMoney(data.payment.amount, data.payment.currency)}</span>
              </div>
              <p className="mt-2 text-xs text-muted">Payment reference: <span className="font-mono font-semibold text-ink">{data.payment.id}</span></p>

              {data.gateway === 'RAZORPAY' && (
                <div className="mt-6 space-y-4">
                  <Button variant="accent" size="lg" className="w-full" loading={busy} onClick={payOnline} icon={<CreditCard className="size-5" />}>Pay securely now</Button>
                  <p className="flex items-center justify-center gap-2 text-xs text-muted"><ShieldCheck className="size-4 text-emerald-600" aria-hidden />UPI, cards and net banking via Razorpay. We never see or store card details.</p>
                </div>
              )}
              {data.gateway === 'MANUAL' && (
                <div className="mt-6 space-y-4">
                  <div className="flex gap-3 rounded-2xl bg-brand-50 p-4 text-sm text-brand-900 ring-1 ring-brand-100">
                    <Landmark className="size-5 shrink-0" aria-hidden /><p className="whitespace-pre-line">{data.instructions}</p>
                  </div>
                  {msg ? <FormSuccess message={msg} /> : data.payment.transactionId ? (
                    <FormSuccess message={`Reference ${data.payment.transactionId} submitted — awaiting verification.`} />
                  ) : (
                    <form onSubmit={(e) => { e.preventDefault(); void submitReference(); }} className="space-y-3">
                      <Field label="Payment reference (UPI / bank transaction ID)" htmlFor="ref" hint="Optional — helps the office verify faster.">
                        <Input id="ref" value={reference} onChange={(e) => setReference(e.target.value)} maxLength={100} required />
                      </Field>
                      <Button type="submit" loading={busy} className="w-full">Submit reference</Button>
                    </form>
                  )}
                </div>
              )}
              <FormError message={err} />
              <div className="mt-6 border-t border-line pt-5 text-center">
                <ButtonLink href={next} variant="ghost" icon={<CircleCheck className="size-4" />}>{data.gateway === 'MANUAL' ? 'Done — view my registration' : 'Pay later'}</ButtonLink>
              </div>
            </>
          )}
        </Card>
      </Container>
    </div>
  );
}
