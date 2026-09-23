'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { api, type Paged } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import type { Row } from '@/lib/types';
import { formatDateRange, formatMoney } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { ButtonLink } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Form';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { PagerButtons } from '@/components/ui/Pagination';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { EventPoster } from '@/components/events/PosterArt';

const s = (v: unknown) => String(v ?? '');

export default function AdminEventsPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [lifecycle, setLifecycle] = useState('');
  const [page, setPage] = useState(1);
  const { data, error, loading } = useApi(() => api.admin.call<Paged<Row>>('getEvents', { q, status, lifecycle, page }), [q, status, lifecycle, page]);
  return (
    <>
      <PortalHeader title="Events" subtitle="Upcoming / ongoing / past is calculated from dates automatically — just set the dates."
        action={<ButtonLink href="/admin/events/new" variant="accent" icon={<Plus className="size-4" />}>Create event</ButtonLink>} />
      <div className="mb-4 flex flex-wrap gap-3">
        <label className="relative min-w-56 flex-1"><span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" /><Input className="pl-9" placeholder="Search events" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></label>
        <Select aria-label="Status" className="w-44" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">All statuses</option>{['DRAFT', 'PUBLISHED', 'CANCELLED', 'ARCHIVED'].map((x) => <option key={x}>{x}</option>)}</Select>
        <Select aria-label="Lifecycle" className="w-44" value={lifecycle} onChange={(e) => { setLifecycle(e.target.value); setPage(1); }}>
          <option value="">Any date</option>{['UPCOMING', 'ONGOING', 'PAST'].map((x) => <option key={x}>{x}</option>)}</Select>
      </div>
      {error ? <ErrorState message={error.message} /> : (
        <Card>
          <DataTable<Row> loading={loading && !data} rows={data?.items || []} rowKey={(r) => s(r.Event_ID)} onRowClick={(r) => router.push(`/admin/events/${s(r.Event_ID)}`)}
            empty={<EmptyState title="No events yet" action={<ButtonLink href="/admin/events/new" size="sm">Create event</ButtonLink>} />}
            columns={[
              { key: 'poster', header: '', hideOnMobile: true, render: (r) => <div className="h-12 w-16 overflow-hidden rounded-lg"><EventPoster url={s(r.posterThumb)} name={s(r.Event_Name)} type={s(r.Event_Type)} start={s(r.Start_Date)} end={s(r.End_Date)} className="size-full [&_p]:hidden" /></div> },
              { key: 'Event_Name', header: 'Event', primary: true, render: (r) => <div><Link href={`/admin/events/${s(r.Event_ID)}`} className="font-semibold hover:text-brand-700">{s(r.Event_Name)}</Link><p className="font-mono text-xs text-muted">{s(r.Event_ID)} · {s(r.Event_Type)}</p></div> },
              { key: 'dates', header: 'Dates', render: (r) => formatDateRange(s(r.Start_Date), s(r.End_Date)) },
              { key: 'City', header: 'City' },
              { key: 'registrationCount', header: 'Entries', render: (r) => `${s(r.registrationCount)}${r.Maximum_Participants ? ' / ' + s(r.Maximum_Participants) : ''}` },
              { key: 'Entry_Fee', header: 'Fee', render: (r) => formatMoney(s(r.Entry_Fee)) },
              { key: 'status', header: 'Status', render: (r) => <div className="flex flex-wrap gap-1"><StatusBadge status={s(r.Status)} /><Badge tone="slate">{s(r.lifecycle)}</Badge></div> },
            ]} />
          {data && <div className="flex justify-between border-t border-line px-5 py-3 text-sm text-muted"><span>{data.total} events</span><PagerButtons page={data.page} totalPages={data.totalPages} onPage={setPage} /></div>}
        </Card>
      )}
    </>
  );
}
