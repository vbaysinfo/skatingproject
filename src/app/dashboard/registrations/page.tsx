'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDate, formatDateRange, formatMoney, ordinal } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import type { Registration } from '@/lib/types';

export default function MyRegistrationsPage() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi(() => api.getStudentRegistrations(), []);
  const [busy, setBusy] = useState('');
  async function cancel(id: string) {
    if (!confirm('Cancel this unpaid registration?')) return;
    setBusy(id);
    try { await api.cancelRegistration(id); toast('Registration cancelled'); await reload(); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Could not cancel', 'error'); }
    finally { setBusy(''); }
  }
  if (error) return <ErrorState message={error.message} />;
  return (
    <>
      <PortalHeader title="My registrations" subtitle="Event entries with registration numbers, bibs, heats, lanes and results." action={<ButtonLink href="/events" variant="accent">Register for an event</ButtonLink>} />
      <Card>
        <DataTable<Registration & Record<string, unknown>>
          loading={loading}
          rows={(data?.events || []) as (Registration & Record<string, unknown>)[]}
          rowKey={(r) => r.id}
          empty={<EmptyState title="No registrations yet" action={<ButtonLink href="/events" size="sm">Browse events</ButtonLink>} />}
          columns={[
            { key: 'eventName', header: 'Event', primary: true, render: (r) => <div><Link href={`/dashboard/registrations/${r.id}`} className="font-semibold hover:text-brand-700">{r.eventName}</Link><p className="text-xs text-muted">{formatDateRange(r.eventStart, r.eventEnd)}</p></div> },
            { key: 'registrationNumber', header: 'Reg. No.', render: (r) => <span className="font-mono text-xs">{r.registrationNumber}</span> },
            { key: 'categoryName', header: 'Category', render: (r) => r.categoryName || 'General' },
            { key: 'bibNumber', header: 'Bib', render: (r) => r.bibNumber || '—' },
            { key: 'heat', header: 'Heat / Lane', render: (r) => [r.heat, r.lane && 'L' + r.lane].filter(Boolean).join(' · ') || '—', hideOnMobile: true },
            { key: 'raceType', header: 'Race', render: (r) => r.raceType || r.distance || '—', hideOnMobile: true },
            { key: 'result', header: 'Result', render: (r) => r.result ? (r.result.status === 'FINISHED' ? <span className="font-semibold">{ordinal(r.result.position)} · {r.result.time}</span> : r.result.status) : '—' },
            { key: 'status', header: 'Status', render: (r) => <div className="flex flex-col gap-1"><StatusBadge status={r.status} /><span className="text-[11px] text-muted">{r.paymentStatus} · {formatMoney(r.amount)}</span></div> },
          ]}
          actions={(r) => (
            <div className="flex justify-end gap-2">
              {r.status === 'PENDING_PAYMENT' && <ButtonLink size="sm" variant="accent" href={`/pay/${r.paymentId}?next=/dashboard/registrations/${r.id}`}>Pay</ButtonLink>}
              <ButtonLink size="sm" variant="secondary" href={`/dashboard/registrations/${r.id}`}>View</ButtonLink>
              {r.status === 'PENDING_PAYMENT' && <Button size="sm" variant="ghost" loading={busy === r.id} onClick={() => cancel(r.id)}>Cancel</Button>}
            </div>
          )}
        />
      </Card>
      {data && data.programs.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Program registrations" />
          <ul className="divide-y divide-line">
            {data.programs.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                <div><Link href={`/programs/${p.programSlug}`} className="font-semibold hover:text-brand-700">{p.programName}</Link><p className="text-xs text-muted">{p.id} · {formatDate(p.date)}</p></div>
                <div className="flex items-center gap-2"><StatusBadge status={p.status} />{p.status === 'PENDING_PAYMENT' && <ButtonLink size="sm" variant="accent" href={`/pay/${p.paymentId}?next=/dashboard/registrations`}>Pay</ButtonLink>}</div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
