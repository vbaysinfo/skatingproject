'use client';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDate, ordinal } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/Badge';
import type { StudentResult } from '@/lib/types';

type R = StudentResult & Record<string, unknown>;

export default function MyResultsPage() {
  const { data, error, loading } = useApi(() => api.getStudentResults(), []);
  if (error) return <ErrorState message={error.message} />;
  return (
    <>
      <PortalHeader title="My results" subtitle="Official results appear here as soon as they are published." />
      <Card>
        <DataTable<R> loading={loading} rows={(data || []) as R[]} rowKey={(r) => r.id}
          empty={<EmptyState title="No results yet" message="Compete in an event — your published results will be listed here." />}
          columns={[
            { key: 'eventName', header: 'Event', primary: true, render: (r) => <div><Link href={`/events/${r.eventSlug}/results`} className="font-semibold hover:text-brand-700">{r.eventName}</Link><p className="text-xs text-muted">{formatDate(r.eventDate)}</p></div> },
            { key: 'categoryName', header: 'Category' },
            { key: 'bib', header: 'Bib', render: (r) => r.bib || '—' },
            { key: 'heat', header: 'Heat / Lane', render: (r) => [r.heat, r.lane && 'L' + r.lane].filter(Boolean).join(' · ') || '—', hideOnMobile: true },
            { key: 'time', header: 'Time', render: (r) => <span className="font-mono font-semibold">{r.time || '—'}</span> },
            { key: 'position', header: 'Position', render: (r) => (r.status === 'FINISHED' ? <span className="font-display text-lg font-bold">{ordinal(r.position) || '—'}</span> : <StatusBadge status={r.status} />) },
            { key: 'points', header: 'Points' },
          ]} />
      </Card>
    </>
  );
}
