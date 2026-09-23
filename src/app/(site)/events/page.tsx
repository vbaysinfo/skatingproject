import type { Metadata } from 'next';
import Link from 'next/link';
import { Search, SlidersHorizontal } from 'lucide-react';
import { getEvents, getSettings } from '@/lib/server/data';
import { cn, countdownLabel } from '@/lib/format';
import { PageHero } from '@/components/site/PageHero';
import { Container } from '@/components/ui/Card';
import { LinkTabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { EventCard } from '@/components/events/EventCard';
import { buttonClass } from '@/components/ui/Button';

export const metadata: Metadata = { title: 'Events', description: 'Upcoming, ongoing and past skating championships, meets and training camps.' };

const TYPES = ['ALL', 'NATIONAL', 'STATE', 'DISTRICT', 'OPEN', 'SCHOOL', 'ACADEMY', 'CHAMPIONSHIP', 'TRAINING', 'OTHER'];
const TABS = [{ key: 'upcoming', label: 'Upcoming' }, { key: 'ongoing', label: 'Ongoing' }, { key: 'past', label: 'Past' }];

type SP = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || '';

export default async function EventsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const tab = TABS.some((t) => t.key === one(sp.tab)) ? one(sp.tab) : 'upcoming';
  const q = { tab, type: one(sp.type).toUpperCase(), state: one(sp.state), city: one(sp.city), q: one(sp.q), month: one(sp.month), page: Number(one(sp.page)) || 1 };
  const [data, settings] = await Promise.all([getEvents(q), getSettings()]);
  const tz = settings.TIMEZONE;

  const href = (patch: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    const merged: Record<string, string | number | undefined> = { ...q, ...patch };
    Object.entries(merged).forEach(([k, v]) => { if (v && !(k === 'page' && v === 1) && !(k === 'type' && v === 'ALL')) params.set(k, String(v)); });
    const s = params.toString();
    return '/events' + (s ? '?' + s : '');
  };
  const emptyMessage = { upcoming: 'No upcoming events found.', ongoing: 'No events are running right now.', past: 'No past events available.' }[tab]!;

  return (
    <>
      <PageHero eyebrow="Compete" title="Events" subtitle="Every championship, open meet and camp — updated automatically as dates arrive." crumbs={[{ label: 'Events' }]}>
        <LinkTabs tabs={TABS.map((t) => ({ ...t, href: href({ tab: t.key, page: 1 }) }))} active={tab} className="bg-white/10 ring-white/15 [&_a:not([aria-selected=true])]:text-white/70" />
      </PageHero>
      <Container className="py-10 sm:py-14">
        <form action="/events" className="mb-6 grid gap-3 rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-line/70 md:grid-cols-[2fr_1fr_1fr_1fr_auto]" role="search">
          <input type="hidden" name="tab" value={tab} />
          {q.type && q.type !== 'ALL' && <input type="hidden" name="type" value={q.type} />}
          <label className="relative block">
            <span className="sr-only">Search events</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
            <input name="q" defaultValue={q.q} placeholder="Search event name, venue or city" className="h-11 w-full rounded-xl border border-line pl-10 pr-3 text-[15px] focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100" />
          </label>
          <label className="block">
            <span className="sr-only">State</span>
            <select name="state" defaultValue={q.state} className="h-11 w-full rounded-xl border border-line px-3 text-[15px] focus:border-brand-400 focus:outline-none">
              <option value="">All states</option>
              {(data?.facets.states || []).map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">City</span>
            <select name="city" defaultValue={q.city} className="h-11 w-full rounded-xl border border-line px-3 text-[15px] focus:border-brand-400 focus:outline-none">
              <option value="">All cities</option>
              {(data?.facets.cities || []).map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Month</span>
            <input type="month" name="month" defaultValue={q.month} className="h-11 w-full rounded-xl border border-line px-3 text-[15px] focus:border-brand-400 focus:outline-none" />
          </label>
          <button className={buttonClass('primary', 'md')}><SlidersHorizontal className="size-4" />Apply</button>
        </form>

        <nav aria-label="Event type" className="scrollbar-none -mx-4 mb-8 flex gap-2 overflow-x-auto px-4">
          {TYPES.map((t) => {
            const active = (q.type || 'ALL') === t;
            return (
              <Link key={t} href={href({ type: t, page: 1 })} aria-current={active ? 'true' : undefined}
                className={cn('shrink-0 rounded-full px-4 py-2 text-[12px] font-bold uppercase tracking-wider ring-1 transition',
                  active ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-ink-soft ring-line hover:ring-brand-300')}>
                {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
              </Link>
            );
          })}
        </nav>

        {!data ? <ErrorState /> : data.items.length === 0 ? (
          <EmptyState title={emptyMessage} message={q.q || q.state || q.city || q.month || (q.type && q.type !== 'ALL') ? 'Try clearing some filters.' : undefined}
            action={<Link href={`/events?tab=${tab}`} className={buttonClass('secondary', 'sm')}>Clear filters</Link>} />
        ) : (
          <>
            <p className="mb-5 text-sm text-muted" aria-live="polite">{data.total} {data.total === 1 ? 'event' : 'events'}</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((e) => <EventCard key={e.id} event={e} countdown={tab === 'past' ? null : countdownLabel(e, tz)} />)}
            </div>
            <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(p) => href({ page: p })} />
          </>
        )}
      </Container>
    </>
  );
}
