import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CalendarDays, MapPin, Users, Clock, Ticket, Building2, Phone, FileDown, Trophy, Images, Timer } from 'lucide-react';
import { getEvent, getSettings } from '@/lib/server/data';
import { countdownLabel, formatDate, formatDateRange, formatDateTime, formatMoney, formatNumber, formatTime, labelize } from '@/lib/format';
import { Container, Card, CardHeader } from '@/components/ui/Card';
import { ButtonLink, buttonClass } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';
import { EventPoster } from '@/components/events/PosterArt';
import { LifecycleBadge, TypeBadge, registrationLabel } from '@/components/events/EventBadges';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { SponsorStrip } from '@/components/site/Announcements';

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const ev = await getEvent(slug);
  if (!ev) return { title: 'Event' };
  const description = `${formatDateRange(ev.startDate, ev.endDate)} · ${[ev.venue, ev.city, ev.state].filter(Boolean).join(', ')}. ${ev.excerpt}`.slice(0, 200);
  return {
    title: ev.name,
    description,
    alternates: { canonical: `/events/${ev.slug}` },
    openGraph: { title: ev.name, description, type: 'article', images: ev.posterUrl ? [ev.posterUrl] : undefined },
  };
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const [ev, settings] = await Promise.all([getEvent(slug), getSettings()]);
  if (ev === null) notFound();
  if (!ev) return <Container className="py-24"><ErrorState /></Container>;

  const countdown = countdownLabel(ev, settings.TIMEZONE);
  const open = ev.registrationState === 'OPEN';
  const spotsLeft = ev.maxParticipants > 0 ? Math.max(0, ev.maxParticipants - ev.registrationCount) : null;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: ev.name,
    startDate: ev.startDate,
    endDate: ev.endDate,
    eventStatus: ev.lifecycle === 'CANCELLED' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    location: { '@type': 'Place', name: ev.venue, address: [ev.city, ev.state].filter(Boolean).join(', ') },
    image: ev.posterUrl || undefined,
    description: ev.excerpt,
    sport: 'Roller skating',
    organizer: { '@type': 'Organization', name: ev.organizer || settings.SITE_NAME },
    offers: { '@type': 'Offer', price: ev.entryFee, priceCurrency: ev.currency, availability: open ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut' },
  };

  const facts = [
    { icon: CalendarDays, label: 'Dates', value: formatDateRange(ev.startDate, ev.endDate) },
    { icon: MapPin, label: 'Venue', value: [ev.venue, ev.city, ev.state].filter(Boolean).join(', ') || 'To be announced' },
    ev.registrationDeadline && { icon: Clock, label: 'Registration deadline', value: formatDateTime(ev.registrationDeadline) },
    { icon: Ticket, label: 'Entry fee', value: formatMoney(ev.entryFee, ev.currency) + (ev.categories.some((c) => c.entryFee !== ev.entryFee) ? ' onwards' : '') },
    { icon: Users, label: 'Registrations', value: formatNumber(ev.registrationCount) + (ev.maxParticipants ? ` / ${formatNumber(ev.maxParticipants)} max` : '') },
    ev.organizer && { icon: Building2, label: 'Organizer', value: ev.organizer },
    ev.contact && { icon: Phone, label: 'Contact', value: ev.contact },
  ].filter(Boolean) as { icon: typeof CalendarDays; label: string; value: string }[];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }} />
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="speed-lines absolute inset-0" aria-hidden />
        <Container className="relative grid gap-10 py-10 lg:grid-cols-[0.9fr_1.1fr] lg:py-16">
          <div className="overflow-hidden rounded-[26px] shadow-[var(--shadow-lift)] ring-1 ring-white/10">
            <EventPoster url={ev.posterUrl} name={ev.name} type={ev.type} start={ev.startDate} end={ev.endDate} className="aspect-[4/3] size-full" />
          </div>
          <div className="flex flex-col">
            <nav aria-label="Breadcrumb" className="text-xs font-semibold uppercase tracking-wider text-white/55">
              <Link href="/" className="hover:text-white">Home</Link> / <Link href="/events" className="hover:text-white">Events</Link>
            </nav>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <TypeBadge type={ev.type} className="bg-white" />
              <LifecycleBadge event={ev} />
              {countdown && countdown !== 'ONGOING' && <Badge tone="accent" className="bg-accent-500 text-white ring-0"><Timer className="size-3" aria-hidden />{countdown}</Badge>}
            </div>
            <h1 className="mt-4 font-display text-[clamp(2.2rem,5vw,3.8rem)] font-extrabold uppercase leading-[0.92]">{ev.name}</h1>
            <dl className="mt-7 grid gap-x-6 gap-y-4 sm:grid-cols-2">
              {facts.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex gap-3">
                  <Icon className="mt-0.5 size-5 shrink-0 text-accent-400" aria-hidden />
                  <div><dt className="text-[11px] font-bold uppercase tracking-wider text-white/50">{label}</dt><dd className="text-[15px] font-semibold">{value}</dd></div>
                </div>
              ))}
            </dl>
            {spotsLeft !== null && open && (
              <div className="mt-6">
                <div className="h-2 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={ev.maxParticipants} aria-valuenow={ev.registrationCount} aria-label="Registrations">
                  <div className="h-full rounded-full bg-accent-500" style={{ width: `${Math.min(100, (ev.registrationCount / ev.maxParticipants) * 100)}%` }} />
                </div>
                <p className="mt-2 text-xs font-semibold text-white/65">{formatNumber(spotsLeft)} spots left</p>
              </div>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              {open ? <ButtonLink href={`/events/${ev.slug}/register`} variant="accent" size="lg" className="uppercase">Register now</ButtonLink>
                : ev.lifecycle !== 'PAST' && <span className={buttonClass('outline-light', 'lg', 'pointer-events-none uppercase opacity-80')} aria-disabled>{registrationLabel(ev)}</span>}
              {ev.rulesUrl && <a href={ev.rulesUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('light', 'lg', 'uppercase')}><FileDown className="size-4" />Download rules</a>}
              {ev.resultsPublished && <ButtonLink href={`/events/${ev.slug}/results`} variant="light" size="lg" className="uppercase"><Trophy className="size-4" />View results</ButtonLink>}
              {ev.galleryCount > 0 && <ButtonLink href={`/gallery?event=${ev.id}`} variant="outline-light" size="lg" className="uppercase"><Images className="size-4" />View gallery</ButtonLink>}
            </div>
            {ev.lifecycle === 'CANCELLED' && <p className="mt-5 rounded-xl bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-100 ring-1 ring-red-400/30">This event has been cancelled. Registered athletes have been notified.</p>}
            {ev.registrationState === 'NOT_OPEN' && ev.registrationStart && <p className="mt-4 text-sm text-white/70">Registration opens {formatDateTime(ev.registrationStart)}.</p>}
          </div>
        </Container>
      </section>

      <Container className="grid gap-8 py-12 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-8">
          {ev.description && (
            <Card><CardHeader title="About this event" />
              <div className="prose-content px-6 py-5 text-[15px] text-ink-soft">{ev.description.split(/\n+/).map((p, i) => <p key={i}>{p}</p>)}</div>
            </Card>
          )}
          {ev.categories.length > 0 && (
            <Card>
              <CardHeader title="Categories" subtitle="Choose your category when you register. Fees and limits may differ per category." />
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr className="border-b border-line bg-surface/70 text-[11px] font-bold uppercase tracking-wider text-muted">
                    <th className="px-5 py-3">Category</th><th className="px-3 py-3">Age group</th><th className="px-3 py-3">Gender</th><th className="px-3 py-3">Race</th><th className="px-3 py-3 text-right">Fee</th><th className="px-5 py-3 text-right">Entries</th>
                  </tr></thead>
                  <tbody>
                    {ev.categories.map((c) => (
                      <tr key={c.id} className="border-b border-line/70 last:border-0">
                        <td className="px-5 py-3 font-semibold text-ink">{c.name}</td>
                        <td className="px-3 py-3">{c.ageGroup || '—'}</td>
                        <td className="px-3 py-3">{labelize(c.gender) || 'Open'}</td>
                        <td className="px-3 py-3">{c.raceType || c.distance || '—'}</td>
                        <td className="px-3 py-3 text-right font-semibold">{formatMoney(c.entryFee, ev.currency)}</td>
                        <td className="px-5 py-3 text-right">
                          {c.registrationState === 'FULL' ? <Badge tone="red">Full</Badge> : <span className="text-muted">{c.registrationCount}{c.maxParticipants ? ` / ${c.maxParticipants}` : ''}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
          {ev.rulesText && (
            <Card><CardHeader title="Rules" />
              <ul className="space-y-2.5 px-6 py-5 text-[15px] text-ink-soft">
                {ev.rulesText.split(/\n+/).filter(Boolean).map((r, i) => <li key={i} className="flex gap-3"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent-500" aria-hidden />{r}</li>)}
              </ul>
            </Card>
          )}
          {ev.gallery.length > 0 && (
            <Card><CardHeader title="Gallery" action={<Link href={`/gallery?event=${ev.id}`} className="text-sm font-bold text-brand-700">View all</Link>} />
              <div className="p-5"><GalleryGrid items={ev.gallery} className="md:columns-3 lg:columns-3" /></div>
            </Card>
          )}
        </div>
        <aside className="space-y-8">
          {ev.schedule.length > 0 && (
            <Card><CardHeader title="Schedule" />
              <ol className="relative space-y-5 px-6 py-5 before:absolute before:bottom-6 before:left-[31px] before:top-6 before:w-px before:bg-line">
                {ev.schedule.map((s, i) => (
                  <li key={i} className="relative flex gap-4 pl-6">
                    <span className="absolute left-0 top-1.5 size-3 rounded-full bg-accent-500 ring-4 ring-accent-50" aria-hidden />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted">{[s.date && formatDate(s.date), s.time && formatTime(s.time)].filter(Boolean).join(' · ')}</p>
                      {/^https?:\/\//.test(s.title) ? <a href={s.title} className="font-semibold text-brand-700 underline" target="_blank" rel="noopener noreferrer">Download schedule</a>
                        : <p className="font-semibold text-ink">{s.title}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          )}
          {ev.mapUrl && (
            <Card className="overflow-hidden"><CardHeader title="Location" />
              <iframe src={ev.mapUrl} title={`Map of ${ev.venue}`} className="h-64 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
            </Card>
          )}
          {ev.sponsors.length > 0 && (
            <Card><CardHeader title="Sponsors" /><div className="p-5"><SponsorStrip sponsors={ev.sponsors} className="grid-cols-2 sm:grid-cols-2 lg:grid-cols-2" /></div></Card>
          )}
          <Card className="p-6">
            <p className="font-display text-xl font-bold uppercase">Need help?</p>
            <p className="mt-1 text-sm text-muted">Questions about categories, eligibility or payments? Our team will help.</p>
            <Link href={`/contact?subject=${encodeURIComponent('Event: ' + ev.name)}`} className={buttonClass('secondary', 'md', 'mt-4 w-full')}>Contact the organisers</Link>
          </Card>
        </aside>
      </Container>
    </>
  );
}
