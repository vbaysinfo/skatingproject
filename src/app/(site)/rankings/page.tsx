import type { Metadata } from 'next';
import { Trophy } from 'lucide-react';
import { getRankings } from '@/lib/server/data';
import { cn, labelize } from '@/lib/format';
import { PageHero } from '@/components/site/PageHero';
import { Container, Card } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Pagination } from '@/components/ui/Pagination';
import { buttonClass } from '@/components/ui/Button';

export const revalidate = 60;
export const metadata: Metadata = { title: 'Rankings', description: 'Athlete rankings based on points from published results.' };

type SP = Promise<Record<string, string | undefined>>;

export default async function RankingsPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = { year: sp.year, category: sp.category, ageGroup: sp.ageGroup, gender: sp.gender, city: sp.city, q: sp.q, page: Number(sp.page) || 1 };
  const data = await getRankings(q);
  const f = data?.facets;
  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    Object.entries({ ...q, page: p }).forEach(([k, v]) => { if (v && !(k === 'page' && v === 1)) params.set(k, String(v)); });
    return '/rankings' + (params.toString() ? '?' + params : '');
  };
  const sel = 'h-11 w-full rounded-xl border border-line bg-white px-3 text-sm';
  return (
    <>
      <PageHero eyebrow="Leaderboard" title="Rankings" subtitle="Points are awarded automatically from published results using the association’s configurable scoring rules." crumbs={[{ label: 'Rankings' }]} />
      <Container className="py-10 sm:py-14">
        <form className="mb-8 grid grid-cols-2 gap-3 rounded-[var(--radius-card)] bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-line/70 md:grid-cols-7" role="search">
          <label className="col-span-2 md:col-span-2"><span className="sr-only">Athlete or academy</span><input name="q" defaultValue={sp.q} placeholder="Athlete or academy" className={sel} /></label>
          <label><span className="sr-only">Year</span><select name="year" defaultValue={sp.year || ''} className={sel}><option value="">All years</option>{f?.years.map((y) => <option key={y}>{y}</option>)}</select></label>
          <label><span className="sr-only">Category</span><select name="category" defaultValue={sp.category || ''} className={sel}><option value="">All races</option>{f?.categories.map((y) => <option key={y}>{y}</option>)}</select></label>
          <label><span className="sr-only">Age group</span><select name="ageGroup" defaultValue={sp.ageGroup || ''} className={sel}><option value="">All ages</option>{f?.ageGroups.map((y) => <option key={y}>{y}</option>)}</select></label>
          <label><span className="sr-only">Gender</span><select name="gender" defaultValue={sp.gender || ''} className={sel}><option value="">All genders</option>{f?.genders.map((y) => <option key={y} value={y}>{labelize(y)}</option>)}</select></label>
          <div className="flex gap-2">
            <label className="flex-1"><span className="sr-only">City</span><select name="city" defaultValue={sp.city || ''} className={sel}><option value="">All cities</option>{f?.cities.map((y) => <option key={y}>{y}</option>)}</select></label>
            <button className={buttonClass('primary', 'md', 'px-4')}>Go</button>
          </div>
        </form>
        {!data ? <ErrorState /> : data.items.length === 0 ? <EmptyState title="No rankings yet" message="Rankings appear once results are published." icon={<Trophy className="size-6" />} /> : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr className="border-b border-line bg-surface/70 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <th className="px-5 py-3">Rank</th><th className="px-3 py-3">Athlete</th><th className="hidden px-3 py-3 md:table-cell">City</th><th className="px-3 py-3 text-center">Events</th>
                  <th className="hidden px-3 py-3 text-center sm:table-cell">🥇 🥈 🥉</th><th className="px-5 py-3 text-right">Points</th>
                </tr></thead>
                <tbody>
                  {data.items.map((r) => (
                    <tr key={r.position + r.studentName} className="border-b border-line/70 last:border-0">
                      <td className="px-5 py-3"><span className={cn('grid size-9 place-items-center rounded-full font-display text-lg font-bold',
                        r.position === 1 ? 'bg-amber-400 text-amber-950' : r.position === 2 ? 'bg-slate-300' : r.position === 3 ? 'bg-orange-300' : 'bg-surface')}>{r.position}</span></td>
                      <td className="px-3 py-3"><p className="font-semibold">{r.studentName}</p>{r.academy && <p className="text-xs text-muted">{r.academy}</p>}</td>
                      <td className="hidden px-3 py-3 md:table-cell">{r.city}</td>
                      <td className="px-3 py-3 text-center">{r.events}</td>
                      <td className="hidden px-3 py-3 text-center font-mono sm:table-cell">{r.gold} · {r.silver} · {r.bronze}</td>
                      <td className="px-5 py-3 text-right font-display text-xl font-bold">{r.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
        {data && <Pagination page={data.page} totalPages={data.totalPages} hrefFor={hrefFor} />}
      </Container>
    </>
  );
}
