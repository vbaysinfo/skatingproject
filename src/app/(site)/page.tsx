import Link from 'next/link';
import { ArrowRight, CalendarDays, Eye, Target, Trophy, Users, Award, GraduationCap, Medal } from 'lucide-react';
import { getHome } from '@/lib/server/data';
import { countdownLabel, formatDateRange, formatNumber } from '@/lib/format';
import { ButtonLink } from '@/components/ui/Button';
import { Container, SectionHeading } from '@/components/ui/Card';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { EventCard } from '@/components/events/EventCard';
import { ProgramCard } from '@/components/programs/ProgramCard';
import { PlanCard } from '@/components/membership/PlanCard';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { VideoGrid } from '@/components/gallery/VideoGrid';
import { AnnouncementCard, SponsorStrip } from '@/components/site/Announcements';

export const revalidate = 60;

export default async function HomePage() {
  const home = await getHome();
  if (!home) {
    return <Container className="py-24"><ErrorState message="We couldn't load the latest content. Please refresh in a moment." /></Container>;
  }
  const { settings: s, hero, about, stats } = home;
  const tz = s.TIMEZONE || 'Asia/Kolkata';
  const next = home.upcomingEvents[0];
  const heroLines = (hero.title || s.SITE_NAME).split(/\n+/).filter(Boolean);
  const statItems = [
    { label: 'Registered Athletes', value: stats.totalStudents, icon: Users },
    { label: 'Active Members', value: stats.activeMembers, icon: Medal },
    { label: 'Events Hosted', value: stats.totalEvents, icon: CalendarDays },
    { label: 'Completed Events', value: stats.completedEvents, icon: Trophy },
    { label: 'Programs', value: stats.programs, icon: GraduationCap },
    { label: 'Certificates Issued', value: stats.certificates, icon: Award },
  ];

  return (
    <>
      {/* HERO */}
      <section className="relative isolate overflow-hidden bg-ink text-white">
        {hero.video ? (
          <video className="absolute inset-0 -z-20 size-full object-cover" src={hero.video} autoPlay muted loop playsInline poster={hero.image} aria-hidden />
        ) : hero.image ? (
          <img src={hero.image} alt="" className="absolute inset-0 -z-20 size-full object-cover" fetchPriority="high" />
        ) : null}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/30" aria-hidden />
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink via-transparent to-transparent" aria-hidden />
        <Container className="grid min-h-[calc(100svh-72px)] max-h-[900px] items-center gap-12 py-16 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="animate-[var(--animate-fade-up)]">
            <p className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[12px] font-bold uppercase tracking-[0.2em] text-white/90 ring-1 ring-white/15 backdrop-blur">
              <span className="size-2 rounded-full bg-accent-500" aria-hidden />{s.SITE_NAME}
            </p>
            <h1 className="font-display text-[clamp(2.9rem,7.5vw,6.2rem)] font-extrabold uppercase leading-[0.9]">
              {heroLines.map((line, i) => (
                <span key={i} className={i === heroLines.length - 1 ? 'block text-accent-500' : 'block'}>{line}</span>
              ))}
            </h1>
            {hero.subtitle && <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/75">{hero.subtitle}</p>}
            <div className="mt-9 flex flex-wrap gap-3">
              <ButtonLink href="/events" variant="accent" size="lg" className="uppercase">Explore Events <ArrowRight className="size-4" /></ButtonLink>
              <ButtonLink href="/membership" variant="light" size="lg" className="uppercase">Become a Member</ButtonLink>
              <ButtonLink href="/programs" variant="outline-light" size="lg" className="uppercase">Our Programs</ButtonLink>
            </div>
          </div>
          {next && (
            <Link href={`/events/${next.slug}`} className="group hidden rounded-[28px] bg-white/10 p-6 ring-1 ring-white/15 backdrop-blur-md transition hover:bg-white/15 lg:block">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent-400">Next up</p>
                {countdownLabel(next, tz) && <span className="rounded-full bg-accent-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider">{countdownLabel(next, tz)}</span>}
              </div>
              <p className="mt-4 font-display text-3xl font-extrabold uppercase leading-[0.95]">{next.name}</p>
              <p className="mt-4 flex items-center gap-2 text-sm text-white/75"><CalendarDays className="size-4" aria-hidden />{formatDateRange(next.startDate, next.endDate)}</p>
              <p className="mt-1.5 text-sm text-white/75">{[next.venue, next.city].filter(Boolean).join(', ')}</p>
              <p className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-white">View event <ArrowRight className="size-4 transition group-hover:translate-x-1" aria-hidden /></p>
            </Link>
          )}
        </Container>
      </section>

      {/* STATS */}
      {s.SHOW_STATISTICS !== 'FALSE' && (
        <section aria-label="Association statistics" className="relative z-10 -mt-px bg-brand-700 text-white">
          <Container className="grid grid-cols-2 gap-px overflow-hidden sm:grid-cols-3 lg:grid-cols-6">
            {statItems.map(({ label, value, icon: Icon }) => (
              <div key={label} className="flex items-center gap-3 px-2 py-6 sm:px-4">
                <Icon className="size-7 shrink-0 text-accent-400" aria-hidden />
                <div>
                  <p className="font-display text-3xl font-extrabold leading-none">{formatNumber(value)}</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-white/70">{label}</p>
                </div>
              </div>
            ))}
          </Container>
        </section>
      )}

      {/* ABOUT PREVIEW */}
      <section className="py-20 sm:py-24">
        <Container className="grid items-center gap-12 lg:grid-cols-2">
          <div className="relative">
            {about.image ? <img src={about.image} alt="" loading="lazy" className="aspect-[4/3] w-full rounded-[28px] object-cover shadow-[var(--shadow-lift)]" />
              : <div className="aspect-[4/3] rounded-[28px] bg-gradient-to-br from-brand-600 to-ink" />}
            <div className="absolute -bottom-6 right-4 rounded-2xl bg-accent-500 px-6 py-4 text-white shadow-[var(--shadow-lift)] sm:right-8">
              <p className="font-display text-4xl font-extrabold leading-none">{formatNumber(stats.totalEvents)}+</p>
              <p className="text-[11px] font-bold uppercase tracking-wider">Events organised</p>
            </div>
          </div>
          <div>
            <SectionHeading eyebrow="About us" title={<>Who we <span className="text-brand-600">are</span></>} subtitle={about.intro} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
                <Eye className="size-6 text-brand-600" aria-hidden />
                <h3 className="mt-3 font-display text-lg font-bold uppercase">Vision</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{about.vision}</p>
              </div>
              <div className="rounded-2xl bg-surface p-5 ring-1 ring-line">
                <Target className="size-6 text-accent-600" aria-hidden />
                <h3 className="mt-3 font-display text-lg font-bold uppercase">Mission</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{about.mission}</p>
              </div>
            </div>
            <ButtonLink href="/about" variant="primary" className="mt-8 uppercase">Learn more <ArrowRight className="size-4" /></ButtonLink>
          </div>
        </Container>
      </section>

      {/* UPCOMING EVENTS */}
      <section className="bg-surface py-20 sm:py-24">
        <Container>
          <SectionHeading eyebrow="Compete" title="Upcoming Events" subtitle="Championships, open meets and training camps — register online in minutes."
            action={<ButtonLink href="/events" variant="secondary" className="uppercase">All events <ArrowRight className="size-4" /></ButtonLink>} />
          {home.upcomingEvents.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {home.upcomingEvents.map((e) => <EventCard key={e.id} event={e} countdown={countdownLabel(e, tz)} />)}
            </div>
          ) : <EmptyState title="No upcoming events found." message="New events are announced regularly — check back soon." />}
        </Container>
      </section>

      {/* ANNOUNCEMENTS */}
      {home.announcements.length > 0 && (
        <section className="py-20 sm:py-24">
          <Container>
            <SectionHeading eyebrow="Latest" title="Announcements" />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {home.announcements.map((a) => <AnnouncementCard key={a.id} a={a} />)}
            </div>
          </Container>
        </section>
      )}

      {/* PROGRAMS */}
      {home.programs.length > 0 && (
        <section className="relative overflow-hidden bg-ink py-20 text-white sm:py-24">
          <div className="speed-lines absolute inset-0" aria-hidden />
          <Container className="relative">
            <SectionHeading dark eyebrow="Develop" title="Programs & Training" subtitle="From first strides to podium finishes — plus coach and official certification."
              action={<ButtonLink href="/programs" variant="light" className="uppercase">All programs <ArrowRight className="size-4" /></ButtonLink>} />
            <div className="grid gap-6 text-ink sm:grid-cols-2 lg:grid-cols-3">
              {home.programs.map((p) => <ProgramCard key={p.id} program={p} />)}
            </div>
          </Container>
        </section>
      )}

      {/* MEMBERSHIP */}
      {home.plans.length > 0 && (
        <section className="py-20 sm:py-24">
          <Container>
            <SectionHeading align="center" eyebrow="Join" title="Become a Member" subtitle="Membership unlocks competition entry, a digital ID, certificates and member benefits." />
            <div className="grid gap-8 pt-3 md:grid-cols-3">
              {home.plans.map((p) => <PlanCard key={p.id} plan={p} />)}
            </div>
          </Container>
        </section>
      )}

      {/* GALLERY */}
      {home.gallery.length > 0 && (
        <section className="bg-surface py-20 sm:py-24">
          <Container>
            <SectionHeading eyebrow="Moments" title="Gallery" action={<ButtonLink href="/gallery" variant="secondary" className="uppercase">View gallery <ArrowRight className="size-4" /></ButtonLink>} />
            <GalleryGrid items={home.gallery} />
          </Container>
        </section>
      )}

      {/* VIDEOS */}
      {home.videos.length > 0 && (
        <section className="py-20 sm:py-24">
          <Container>
            <SectionHeading eyebrow="Watch" title="Highlights" action={<ButtonLink href="/gallery?tab=videos" variant="secondary" className="uppercase">All videos</ButtonLink>} />
            <VideoGrid videos={home.videos} />
          </Container>
        </section>
      )}

      {/* SPONSORS */}
      {home.sponsors.length > 0 && (
        <section className="border-t border-line py-16">
          <Container>
            <p className="mb-8 text-center text-[12px] font-bold uppercase tracking-[0.25em] text-muted">Our partners &amp; sponsors</p>
            <SponsorStrip sponsors={home.sponsors} />
          </Container>
        </section>
      )}

      {/* CTA */}
      <section className="px-4 pb-20 sm:px-6 lg:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[32px] bg-gradient-to-br from-accent-500 to-accent-700 px-6 py-14 text-white sm:px-14">
          <div className="speed-lines absolute inset-0" aria-hidden />
          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div>
              <h2 className="font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl">Ready to race?</h2>
              <p className="mt-3 max-w-xl text-white/85">Create your athlete profile once — then register for events, track results and download certificates.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/register" variant="light" size="lg" className="uppercase">Create account</ButtonLink>
              <ButtonLink href="/events" variant="outline-light" size="lg" className="uppercase">Browse events</ButtonLink>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
