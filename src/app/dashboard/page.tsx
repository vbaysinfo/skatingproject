'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { IdCard, CalendarDays, ClipboardList, Award, Medal, Timer, ArrowRight, Trophy, Activity } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDate, formatDateRange, labelize } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { ErrorState, Skeleton, EmptyState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { FormSuccess } from '@/components/ui/Form';

function Welcome() {
  const welcome = useSearchParams().get('welcome');
  return welcome ? <div className="mb-6"><FormSuccess message="Your athlete account is ready. Welcome aboard!" /></div> : null;
}

export default function DashboardPage() {
  const { data, error, loading, reload } = useApi(() => api.getStudentDashboard(), []);
  if (error) return <ErrorState message={error.message} action={<button onClick={reload} className="font-semibold text-brand-700">Try again</button>} />;
  const d = data;
  const medals = d?.stats.medals;
  return (
    <>
      <Suspense><Welcome /></Suspense>
      <PortalHeader title={loading ? <Skeleton className="h-10 w-72" /> : <>Welcome, {d!.student.firstName}</>}
        subtitle={d ? <>Student ID <span className="font-mono font-semibold text-ink">{d.student.id}</span> · {d.student.academy || 'Independent athlete'}</> : undefined}
        action={<ButtonLink href="/events" variant="accent">Find events</ButtonLink>} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32" />) : d && (
          <>
            <StatCard label="Membership status" icon={<IdCard className="size-5" />} value={d.membership ? <StatusBadge status={d.membership.status} className="text-sm" /> : 'None'}
              hint={d.membership?.expiryDate ? `Valid until ${formatDate(d.membership.expiryDate)}` : <Link href="/membership" className="font-semibold text-brand-700">Become a member →</Link>} />
            <StatCard label="Upcoming events" icon={<CalendarDays className="size-5" />} value={d.stats.upcomingEvents} tone="accent" hint="Registered & coming up" />
            <StatCard label="Registered events" icon={<ClipboardList className="size-5" />} value={d.stats.registeredEvents} tone="violet" hint="All time" />
            <StatCard label="Certificates" icon={<Award className="size-5" />} value={d.stats.certificates} tone="green" hint={<Link href="/dashboard/certificates" className="font-semibold text-brand-700">View →</Link>} />
            <StatCard label="Achievements" icon={<Medal className="size-5" />} value={d.stats.achievements} tone="accent" />
            <StatCard label="Medals" icon={<Trophy className="size-5" />} tone="slate"
              value={<span className="flex gap-3 text-2xl"><span title="Gold">🥇{medals!.gold}</span><span title="Silver">🥈{medals!.silver}</span><span title="Bronze">🥉{medals!.bronze}</span></span>} />
            <StatCard className="sm:col-span-2" label="Personal best" icon={<Timer className="size-5" />}
              value={d.personalBests[0] ? <span>{d.personalBests[0].time} <span className="text-base font-semibold text-muted">{d.personalBests[0].race}</span></span> : '—'}
              hint={d.personalBests.length > 1 ? d.personalBests.slice(1, 4).map((p) => `${p.race}: ${p.time}`).join(' · ') : 'Recorded from published race times'} />
          </>
        )}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title="My upcoming events" action={<Link href="/dashboard/registrations" className="text-sm font-bold text-brand-700">All registrations</Link>} />
          {loading ? <div className="space-y-2 p-5"><Skeleton className="h-16" /><Skeleton className="h-16" /></div> : d!.upcomingRegistrations.length ? (
            <ul className="divide-y divide-line">
              {d!.upcomingRegistrations.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div className="min-w-0">
                    <Link href={`/dashboard/registrations/${r.id}`} className="font-semibold hover:text-brand-700">{r.eventName}</Link>
                    <p className="text-sm text-muted">{formatDateRange(r.eventStart, r.eventEnd)} · {r.categoryName || 'General'}{r.bibNumber ? ` · Bib ${r.bibNumber}` : ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.status === 'PENDING_PAYMENT' && <ButtonLink href={`/pay/${r.paymentId}?next=/dashboard/registrations/${r.id}`} size="sm" variant="accent">Pay now</ButtonLink>}
                  </div>
                </li>
              ))}
            </ul>
          ) : <div className="p-5"><EmptyState title="No upcoming events" message="Browse open events and register in a few clicks." action={<ButtonLink href="/events" size="sm">Browse events</ButtonLink>} /></div>}
        </Card>
        <Card>
          <CardHeader title="Recent activity" />
          {loading ? <div className="space-y-2 p-5"><Skeleton className="h-10" /><Skeleton className="h-10" /></div> : d!.recentActivity.length ? (
            <ol className="space-y-4 p-5">
              {d!.recentActivity.map((a, i) => (
                <li key={i} className="flex gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-600"><Activity className="size-4" aria-hidden /></span>
                  <div><p className="text-sm font-semibold">{a.title}</p><p className="text-xs text-muted">{labelize(a.type)} · {formatDate(a.date)}</p></div>
                </li>
              ))}
            </ol>
          ) : <p className="p-5 text-sm text-muted">Your competition registrations, results, certificates and achievements will appear here.</p>}
        </Card>
      </div>

      {d && d.openEvents.length > 0 && (
        <Card className="mt-6">
          <CardHeader title="Open for registration" action={<Link href="/events" className="text-sm font-bold text-brand-700">All events</Link>} />
          <ul className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
            {d.openEvents.map((e) => (
              <li key={e.id} className="bg-white p-5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-accent-600">{e.type}</p>
                <Link href={`/events/${e.slug}`} className="mt-1 block font-display text-lg font-bold uppercase leading-tight hover:text-brand-700">{e.name}</Link>
                <p className="mt-1 text-sm text-muted">{formatDateRange(e.startDate, e.endDate)} · {e.city}</p>
                {e.registrationState === 'OPEN' && <Link href={`/events/${e.slug}/register`} className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand-700">Register <ArrowRight className="size-4" /></Link>}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
