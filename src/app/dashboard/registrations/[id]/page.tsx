'use client';
import Link from 'next/link';
import { use } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CircleCheck, Printer, CreditCard, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDate, formatDateRange, formatMoney, formatTimestamp, labelize, ordinal } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { LogoMark } from '@/components/site/Logo';
import { QrCode } from '@/components/membership/QrCode';
import { useSettings } from '@/components/portal/SettingsContext';

function Detail({ id }: { id: string }) {
  const isNew = useSearchParams().get('new') === '1';
  const settings = useSettings();
  const { data: r, error, loading } = useApi(() => api.getRegistration(id), [id]);
  if (loading) return <LoadingState />;
  if (error || !r) return <ErrorState message={error?.message} />;
  const confirmed = r.status === 'CONFIRMED';
  const rows: [string, string][] = [
    ['Event', r.eventName], ['Dates', formatDateRange(r.eventStart, r.eventEnd)], ['Venue', [r.venue, r.city].filter(Boolean).join(', ')],
    ['Athlete', `${r.student?.name || ''} (${r.student?.id || ''})`], ['Category', r.categoryName || 'General'], ['Registration number', r.registrationNumber],
    ['Registration date', formatDate(r.registrationDate)], ['Bib / Heat / Lane', [r.bibNumber || '—', r.heat || '—', r.lane || '—'].join(' / ')],
    ['Payment status', labelize(r.paymentStatus)],
  ];
  return (
    <div className="mx-auto max-w-3xl">
      {isNew && (
        <div className="no-print mb-6 flex items-center gap-4 rounded-[var(--radius-card)] bg-emerald-600 p-6 text-white">
          <CircleCheck className="size-10 shrink-0" aria-hidden />
          <div>
            <p className="font-display text-3xl font-extrabold uppercase leading-none">{confirmed ? 'Registration successful' : 'Registration received'}</p>
            <p className="mt-1 text-white/85">{confirmed ? 'You are confirmed. See you at the start line!' : 'Your place is reserved. Complete payment to confirm it.'}</p>
          </div>
        </div>
      )}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 bg-ink px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <LogoMark logoUrl={settings.SITE_LOGO} className="size-10" />
            <div><p className="font-display text-lg font-bold uppercase leading-tight">{settings.SITE_NAME}</p><p className="text-[11px] uppercase tracking-widest text-white/60">Registration receipt</p></div>
          </div>
          <StatusBadge status={r.status} />
        </div>
        <div className="grid gap-6 p-6 sm:grid-cols-[1fr_auto]">
          <dl className="divide-y divide-line">
            {rows.map(([k, v]) => <div key={k} className="flex flex-wrap justify-between gap-2 py-2.5 text-sm"><dt className="text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>)}
            {r.result && <div className="flex justify-between gap-2 py-2.5 text-sm"><dt className="text-muted">Result</dt><dd className="font-semibold">{r.result.status === 'FINISHED' ? `${ordinal(r.result.position)} · ${r.result.time}` : r.result.status}</dd></div>}
          </dl>
          <div className="flex flex-col items-center gap-2">
            <QrCode value={r.registrationNumber} size={120} label={'Registration ' + r.registrationNumber} />
            <p className="font-mono text-xs text-muted">{r.registrationNumber}</p>
          </div>
        </div>
        {r.payment && (
          <div className="border-t border-line bg-surface px-6 py-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <span className="text-muted">Payment {r.payment.id}{r.payment.transactionId ? ` · Txn ${r.payment.transactionId}` : ''}</span>
              <span className="font-display text-xl font-bold">{formatMoney(r.payment.amount, r.payment.currency)} <StatusBadge status={r.payment.status} /></span>
            </div>
            {r.payment.createdAt && <p className="mt-1 text-xs text-muted">Issued {formatTimestamp(r.payment.createdAt, settings.TIMEZONE)}</p>}
          </div>
        )}
      </Card>
      <div className="no-print mt-6 flex flex-wrap gap-3">
        {r.status === 'PENDING_PAYMENT' && <ButtonLink href={`/pay/${r.paymentId}?next=/dashboard/registrations/${r.id}`} variant="accent" icon={<CreditCard className="size-4" />}>Complete payment</ButtonLink>}
        <Button variant="secondary" onClick={() => window.print()} icon={<Printer className="size-4" />}>Download receipt</Button>
        <ButtonLink href="/dashboard/registrations" variant="ghost">View all registrations</ButtonLink>
        {r.eventSlug && <Link href={`/events/${r.eventSlug}`} className="inline-flex items-center gap-1 px-2 text-sm font-semibold text-brand-700"><Clock className="size-4" />Event details</Link>}
      </div>
    </div>
  );
}

export default function RegistrationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Suspense fallback={<LoadingState />}><Detail id={id} /></Suspense>;
}
