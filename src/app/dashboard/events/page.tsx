'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { countdownLabel, formatDateRange, ordinal } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { ButtonTabs } from '@/components/ui/Tabs';
import { ErrorState, LoadingState, EmptyState } from '@/components/ui/States';
import { Badge, StatusBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { EventCard } from '@/components/events/EventCard';
import { useSettings } from '@/components/portal/SettingsContext';
import type { Registration } from '@/lib/types';

function RegList({ regs, past }: { regs: Registration[]; past?: boolean }) {
  if (!regs.length) return <EmptyState title={past ? 'No past events yet' : 'No registered events'} action={past ? undefined : <ButtonLink href="/events" size="sm">Browse events</ButtonLink>} />;
  return (
    <Card>
      <ul className="divide-y divide-line">
        {regs.map((r) => (
          <li key={r.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1.5fr_1fr_auto] md:items-center">
            <div className="min-w-0">
              <Link href={`/dashboard/registrations/${r.id}`} className="font-semibold hover:text-brand-700">{r.eventName}</Link>
              <p className="text-sm text-muted">{formatDateRange(r.eventStart, r.eventEnd)} · {r.venue}</p>
              <p className="mt-1 font-mono text-xs text-muted">{r.registrationNumber}</p>
            </div>
            <dl className="grid grid-cols-4 gap-2 text-xs">
              {[['Category', r.categoryName || 'General'], ['Bib', r.bibNumber || '—'], ['Heat', r.heat || '—'], ['Lane', r.lane || '—']].map(([k, v]) => (
                <div key={k} className="min-w-0"><dt className="font-bold uppercase tracking-wider text-muted">{k}</dt><dd className="truncate font-semibold">{v}</dd></div>
              ))}
            </dl>
            <div className="flex items-center gap-2 md:justify-end">
              {r.result ? <Badge tone="violet">{r.result.status === 'FINISHED' ? `${ordinal(r.result.position)} · ${r.result.time}` : r.result.status}</Badge> : <StatusBadge status={r.status} />}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export default function MyEventsPage() {
  const settings = useSettings();
  const [tab, setTab] = useState('upcoming');
  const { data, error, loading } = useApi(() => api.getStudentEvents(), []);
  return (
    <>
      <PortalHeader title="My events" subtitle="Open events, your registrations and your competition history." />
      <ButtonTabs className="mb-6" active={tab} onChange={setTab} tabs={[{ key: 'upcoming', label: 'Upcoming events' }, { key: 'registered', label: 'Registered' }, { key: 'past', label: 'Past' }]} />
      {loading ? <LoadingState /> : error || !data ? <ErrorState message={error?.message} /> : tab === 'upcoming' ? (
        data.upcoming.length ? (
          <div className="grid gap-6 sm:grid-cols-2 2xl:grid-cols-3">
            {data.upcoming.map((e) => (
              <div key={e.id} className="relative">
                {e.isRegistered && <span className="absolute left-3 top-14 z-10 rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-extrabold uppercase text-white shadow">Registered</span>}
                <EventCard event={e} countdown={countdownLabel(e, settings.TIMEZONE)} />
              </div>
            ))}
          </div>
        ) : <EmptyState title="No upcoming events found." />
      ) : tab === 'registered' ? <RegList regs={data.registered} /> : <RegList regs={data.past} past />}
    </>
  );
}
