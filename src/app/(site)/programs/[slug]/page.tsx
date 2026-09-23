import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Clock, MapPin, BadgeCheck, UserCheck, Wallet } from 'lucide-react';
import { getProgram } from '@/lib/server/data';
import { formatMoney, labelize } from '@/lib/format';
import { PageHero } from '@/components/site/PageHero';
import { Container, Card, CardHeader, SectionHeading } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/States';
import { ProgramCard } from '@/components/programs/ProgramCard';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { PosterArt } from '@/components/events/PosterArt';
import { ProgramRegister } from './ProgramRegister';

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProgram(slug);
  if (!p) return { title: 'Program' };
  return { title: p.name, description: p.shortDescription, alternates: { canonical: `/programs/${p.slug}` }, openGraph: { title: p.name, description: p.shortDescription, images: p.imageUrl ? [p.imageUrl] : undefined } };
}

export default async function ProgramPage({ params }: Props) {
  const { slug } = await params;
  const p = await getProgram(slug);
  if (p === null) notFound();
  if (!p) return <Container className="py-24"><ErrorState /></Container>;
  const facts = [
    { icon: Clock, label: 'Duration', value: p.duration }, { icon: UserCheck, label: 'Eligibility', value: p.eligibility },
    { icon: MapPin, label: 'Location', value: p.location }, { icon: BadgeCheck, label: 'Certification', value: p.certification },
    { icon: Wallet, label: 'Fee', value: formatMoney(p.fee) },
  ].filter((f) => f.value);
  return (
    <>
      <PageHero eyebrow={labelize(p.type)} title={p.name} subtitle={p.shortDescription} crumbs={[{ label: 'Programs', href: '/programs' }, { label: p.name }]} />
      <Container className="grid gap-8 py-12 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-8">
          <div className="overflow-hidden rounded-[var(--radius-card)] shadow-[var(--shadow-card)]">
            {p.imageUrl ? <img src={p.imageUrl} alt="" className="aspect-[16/9] w-full object-cover" /> : <PosterArt title={p.name} kicker={labelize(p.type)} className="aspect-[16/9]" />}
          </div>
          <Card><CardHeader title="About the program" />
            <div className="prose-content px-6 py-5 text-[15px] text-ink-soft">{(p.fullDescription || p.shortDescription).split(/\n+/).map((t, i) => <p key={i}>{t}</p>)}</div>
          </Card>
          {p.schedule && <Card><CardHeader title="Schedule" /><p className="whitespace-pre-line px-6 py-5 text-[15px] text-ink-soft">{p.schedule}</p></Card>}
          {p.gallery && p.gallery.length > 0 && <Card><CardHeader title="Gallery" /><div className="p-5"><GalleryGrid items={p.gallery} /></div></Card>}
        </div>
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start" id="register">
          <Card className="p-6">
            <dl className="space-y-4">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex gap-3"><Icon className="mt-0.5 size-5 text-brand-500" aria-hidden />
                  <div><dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</dt><dd className="font-semibold">{value}</dd></div></div>
              ))}
            </dl>
            <ProgramRegister programId={p.id} programName={p.name} open={p.registrationStatus === 'OPEN'} />
          </Card>
        </aside>
      </Container>
      {p.related && p.related.length > 0 && (
        <section className="bg-surface py-16"><Container><SectionHeading title="Related programs" />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{p.related.map((r) => <ProgramCard key={r.id} program={r} />)}</div></Container></section>
      )}
    </>
  );
}
