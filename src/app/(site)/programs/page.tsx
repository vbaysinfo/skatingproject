import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
import { getPrograms } from '@/lib/server/data';
import { cn, formatMoney, labelize } from '@/lib/format';
import { PageHero } from '@/components/site/PageHero';
import { Container, SectionHeading } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { ProgramCard } from '@/components/programs/ProgramCard';
import { Badge } from '@/components/ui/Badge';

export const revalidate = 60;
export const metadata: Metadata = { title: 'Programs', description: 'Skating training, competition squads, school and academy programs, coach and official certification.' };

const TYPES = ['ALL', 'SKATING_TRAINING', 'COMPETITION_TRAINING', 'SCHOOL_PROGRAM', 'ACADEMY_PROGRAM', 'COACH_DEVELOPMENT', 'OFFICIAL_JUDGE_PROGRAM', 'CERTIFICATION_PROGRAM', 'OTHER'];

export default async function ProgramsPage({ searchParams }: { searchParams: Promise<{ type?: string; q?: string }> }) {
  const sp = await searchParams;
  const type = (sp.type || 'ALL').toUpperCase();
  const data = await getPrograms(type === 'ALL' ? undefined : type);
  const q = (sp.q || '').toLowerCase();
  const items = (data?.items || []).filter((p) => !q || (p.name + ' ' + p.shortDescription).toLowerCase().includes(q));
  return (
    <>
      <PageHero eyebrow="Develop" title="Programs" subtitle="Training pathways for every level, plus certification for coaches, officials and judges." crumbs={[{ label: 'Programs' }]} />
      <Container className="py-10 sm:py-14">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <nav aria-label="Program type" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4">
            {TYPES.map((t) => (
              <Link key={t} href={t === 'ALL' ? '/programs' : `/programs?type=${t}`} aria-current={type === t ? 'true' : undefined}
                className={cn('shrink-0 rounded-full px-4 py-2 text-[12px] font-bold uppercase tracking-wider ring-1', type === t ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-ink-soft ring-line hover:ring-brand-300')}>
                {t === 'ALL' ? 'All' : labelize(t)}
              </Link>
            ))}
          </nav>
          <form role="search" className="shrink-0">
            {type !== 'ALL' && <input type="hidden" name="type" value={type} />}
            <label className="sr-only" htmlFor="pq">Search programs</label>
            <input id="pq" name="q" defaultValue={sp.q} placeholder="Search programs" className="h-11 w-full rounded-full border border-line px-4 text-sm lg:w-64" />
          </form>
        </div>
        {!data ? <ErrorState /> : items.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map((p) => <ProgramCard key={p.id} program={p} />)}</div>
        ) : <EmptyState title="No programs found" message="Try another category." />}
      </Container>
      {data && data.certifications.length > 0 && (
        <section id="certification" className="bg-surface py-16 sm:py-20">
          <Container>
            <SectionHeading eyebrow="Get certified" title="Certification Programs" subtitle="Recognised certification for students, coaches, officials and judges. Earned certificates appear in the athlete dashboard and can be verified online." />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {data.certifications.map((c) => (
                <article key={c.id} className="rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-line/70">
                  <div className="flex items-start justify-between gap-3">
                    <BadgeCheck className="size-8 text-brand-600" aria-hidden />
                    <Badge tone="brand">{c.level || 'Level'}</Badge>
                  </div>
                  <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-accent-600">{labelize(c.type)}</p>
                  <h3 className="mt-1 font-display text-2xl font-bold uppercase leading-tight">{c.name}</h3>
                  {c.description && <p className="mt-2 text-sm text-muted">{c.description}</p>}
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    {[['Eligibility', c.eligibility], ['Duration', c.duration], ['Assessment', c.assessment], ['Certificate', c.certificateType]].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k}><dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{k}</dt><dd className="font-medium">{v}</dd></div>
                    ))}
                  </dl>
                  <div className="mt-5 flex items-center justify-between border-t border-line pt-4">
                    <span className="font-display text-2xl font-bold">{formatMoney(c.fee)}</span>
                    <Link href={`/contact?subject=${encodeURIComponent('Certification: ' + c.name)}`} className="text-sm font-bold text-brand-700 hover:underline">Enquire →</Link>
                  </div>
                </article>
              ))}
            </div>
          </Container>
        </section>
      )}
    </>
  );
}
