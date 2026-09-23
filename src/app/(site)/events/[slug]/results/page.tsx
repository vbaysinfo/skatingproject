import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Medal } from 'lucide-react';
import { getEventResults } from '@/lib/server/data';
import { cn, formatDateRange, ordinal } from '@/lib/format';
import { PageHero } from '@/components/site/PageHero';
import { Container, Card, CardHeader } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/Badge';

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = await getEventResults(slug);
  return { title: r ? `Results — ${r.event.name}` : 'Results', description: r ? `Official published results for ${r.event.name}.` : undefined };
}

const medal = (p: number | null) => (p === 1 ? 'bg-amber-400 text-amber-950' : p === 2 ? 'bg-slate-300 text-slate-800' : p === 3 ? 'bg-orange-300 text-orange-950' : 'bg-surface text-ink-soft');

export default async function ResultsPage({ params }: Props) {
  const { slug } = await params;
  const data = await getEventResults(slug);
  if (!data) notFound();
  const { event, categories } = data;
  return (
    <>
      <PageHero eyebrow="Official results" title={event.name} subtitle={formatDateRange(event.startDate, event.endDate) + (event.city ? ' · ' + event.city : '')}
        crumbs={[{ label: 'Events', href: '/events' }, { label: event.name, href: `/events/${event.slug}` }, { label: 'Results' }]} />
      <Container className="space-y-8 py-12">
        {categories.length === 0 ? <EmptyState title="Results not published yet" message="Results appear here as soon as the officials publish them." icon={<Medal className="size-6" />} /> :
          categories.map((g) => (
            <Card key={g.categoryId || g.categoryName}>
              <CardHeader title={g.categoryName} subtitle={[g.ageGroup, g.gender, g.raceType || g.distance].filter(Boolean).join(' · ')} />
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <caption className="sr-only">Results for {g.categoryName}</caption>
                  <thead><tr className="border-b border-line bg-surface/70 text-[11px] font-bold uppercase tracking-wider text-muted">
                    <th scope="col" className="px-5 py-3">Pos</th><th scope="col" className="px-3 py-3">Athlete</th><th scope="col" className="px-3 py-3">Bib</th>
                    <th scope="col" className="hidden px-3 py-3 sm:table-cell">Heat / Lane</th><th scope="col" className="px-3 py-3 text-right">Time</th><th scope="col" className="px-5 py-3 text-right">Points</th>
                  </tr></thead>
                  <tbody>
                    {g.results.map((r, i) => (
                      <tr key={i} className="border-b border-line/70 last:border-0">
                        <td className="px-5 py-3">
                          {r.status === 'FINISHED' && r.position ? <span className={cn('grid size-8 place-items-center rounded-full text-xs font-extrabold', medal(r.position))}>{ordinal(r.position)}</span> : <StatusBadge status={r.status} />}
                        </td>
                        <td className="px-3 py-3"><p className="font-semibold text-ink">{r.studentName}</p>{r.academy && <p className="text-xs text-muted">{r.academy}</p>}</td>
                        <td className="px-3 py-3 font-mono">{r.bib || '—'}</td>
                        <td className="hidden px-3 py-3 sm:table-cell">{[r.heat, r.lane && 'Lane ' + r.lane].filter(Boolean).join(' · ') || '—'}</td>
                        <td className="px-3 py-3 text-right font-mono font-semibold">{r.time || '—'}</td>
                        <td className="px-5 py-3 text-right">{r.points || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        <p className="text-center text-sm"><Link href="/rankings" className="font-bold text-brand-700 hover:underline">See overall rankings →</Link></p>
      </Container>
    </>
  );
}
