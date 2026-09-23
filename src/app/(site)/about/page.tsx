import type { Metadata } from 'next';
import { Eye, Target, Users, Medal, CalendarDays, Award } from 'lucide-react';
import { getAbout } from '@/lib/server/data';
import { formatNumber } from '@/lib/format';
import { PageHero } from '@/components/site/PageHero';
import { Container, SectionHeading } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/States';
import { SponsorStrip } from '@/components/site/Announcements';
import { ButtonLink } from '@/components/ui/Button';

export const revalidate = 60;
export const metadata: Metadata = { title: 'About', description: 'Our vision, mission and the work of the association.' };

export default async function AboutPage() {
  const about = await getAbout();
  if (!about) return <Container className="py-24"><ErrorState /></Container>;
  const stats = [
    { icon: Users, label: 'Registered athletes', value: about.stats.totalStudents },
    { icon: Medal, label: 'Active members', value: about.stats.activeMembers },
    { icon: CalendarDays, label: 'Events completed', value: about.stats.completedEvents },
    { icon: Award, label: 'Certificates issued', value: about.stats.certificates },
  ];
  return (
    <>
      <PageHero eyebrow="About us" title="Growing the sport together" subtitle={about.intro} crumbs={[{ label: 'About' }]} />
      <section className="py-16 sm:py-20">
        <Container className="grid items-start gap-12 lg:grid-cols-2">
          <div>
            <SectionHeading eyebrow="Our story" title="Who we are" />
            <div className="prose-content text-[16px] text-ink-soft">{(about.full || about.intro).split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>
            <ButtonLink href="/contact" variant="primary" className="mt-8">Get in touch</ButtonLink>
          </div>
          {about.image && <img src={about.image} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-[28px] object-cover shadow-[var(--shadow-lift)]" />}
        </Container>
      </section>
      <section className="bg-surface py-16 sm:py-20">
        <Container className="grid gap-6 md:grid-cols-2">
          <div className="rounded-[var(--radius-card)] bg-white p-8 shadow-[var(--shadow-card)] ring-1 ring-line/70">
            <Eye className="size-8 text-brand-600" aria-hidden />
            <h2 className="mt-4 font-display text-3xl font-extrabold uppercase">Vision</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-ink-soft">{about.vision}</p>
          </div>
          <div className="rounded-[var(--radius-card)] bg-ink p-8 text-white shadow-[var(--shadow-card)]">
            <Target className="size-8 text-accent-400" aria-hidden />
            <h2 className="mt-4 font-display text-3xl font-extrabold uppercase">Mission</h2>
            <p className="mt-3 text-[16px] leading-relaxed text-white/80">{about.mission}</p>
          </div>
        </Container>
      </section>
      <section className="py-16">
        <Container className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="text-center">
              <Icon className="mx-auto size-8 text-accent-500" aria-hidden />
              <p className="mt-3 font-display text-5xl font-extrabold">{formatNumber(value)}</p>
              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted">{label}</p>
            </div>
          ))}
        </Container>
      </section>
      {about.sponsors.length > 0 && (
        <section className="border-t border-line py-16"><Container><SectionHeading align="center" eyebrow="Partners" title="Our sponsors" /><SponsorStrip sponsors={about.sponsors} /></Container></section>
      )}
    </>
  );
}
