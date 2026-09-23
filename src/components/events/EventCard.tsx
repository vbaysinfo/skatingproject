import Link from 'next/link';
import { CalendarDays, MapPin, Users, Trophy, Images, Award } from 'lucide-react';
import type { EventSummary } from '@/lib/types';
import { cn, formatDateRange, formatMoney, formatNumber } from '@/lib/format';
import { buttonClass } from '@/components/ui/Button';
import { EventPoster } from './PosterArt';
import { LifecycleBadge, TypeBadge, registrationLabel } from './EventBadges';

/**
 * Event card (spec §10 / §124). Props: event, registrationCount,
 * lifecycleStatus, countdown — all calculated from Google Sheets data.
 */
export function EventCard({ event, registrationCount = event.registrationCount, lifecycleStatus = event.lifecycle, countdown, className }: {
  event: EventSummary; registrationCount?: number; lifecycleStatus?: EventSummary['lifecycle']; countdown?: string | null; className?: string;
}) {
  const href = `/events/${event.slug}`;
  const past = lifecycleStatus === 'PAST';
  const canRegister = event.registrationState === 'OPEN' && !past;
  return (
    <article className={cn('group flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)] ring-1 ring-line/70 transition duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]', className)}>
      <Link href={href} className="relative block aspect-[4/3] overflow-hidden bg-ink" tabIndex={-1} aria-hidden>
        <EventPoster url={event.posterUrl} name={event.name} type={event.type} start={event.startDate} end={event.endDate}
          className="size-full transition duration-500 group-hover:scale-[1.04]" />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3.5">
          <TypeBadge type={event.type} className="bg-white/95 shadow-sm" />
          {countdown ? (
            <span className={cn('rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-md',
              countdown === 'ONGOING' || countdown === 'TODAY' ? 'bg-emerald-500' : 'bg-accent-500')}>{countdown}</span>
          ) : lifecycleStatus !== 'UPCOMING' ? <LifecycleBadge event={{ lifecycle: lifecycleStatus }} /> : null}
        </div>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[22px] font-bold uppercase leading-[1.05] text-ink">
          <Link href={href} className="line-clamp-2 hover:text-brand-700">{event.name}</Link>
        </h3>
        <ul className="mt-3.5 space-y-2 text-sm text-ink-soft">
          <li className="flex items-center gap-2.5"><CalendarDays className="size-4 shrink-0 text-brand-500" aria-hidden />{formatDateRange(event.startDate, event.endDate)}</li>
          <li className="flex items-center gap-2.5"><MapPin className="size-4 shrink-0 text-brand-500" aria-hidden /><span className="truncate">{[event.venue, event.city].filter(Boolean).join(', ') || 'Venue to be announced'}</span></li>
          <li className="flex items-center gap-2.5"><Users className="size-4 shrink-0 text-brand-500" aria-hidden />
            <span><strong className="font-semibold text-ink">{formatNumber(registrationCount)}</strong> {past ? 'Participants' : 'Registered'}</span>
          </li>
        </ul>
        <div className="mt-auto pt-5">
          {!past && (
            <div className="mb-4 flex items-end justify-between rounded-2xl bg-surface px-4 py-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Entry Fee</p>
                <p className="font-display text-2xl font-bold text-ink">{formatMoney(event.entryFee, event.currency)}</p>
              </div>
              {event.maxParticipants > 0 && event.registrationState === 'OPEN' && (
                <p className="text-right text-[11px] font-semibold text-muted">{formatNumber(Math.max(0, event.maxParticipants - registrationCount))} spots left</p>
              )}
            </div>
          )}
          {past ? (
            <div className="grid grid-cols-2 gap-2">
              {event.resultsPublished && <Link href={`${href}/results`} className={buttonClass('primary', 'sm')}><Trophy className="size-4" />Results</Link>}
              {event.galleryCount > 0 && <Link href={`/gallery?event=${event.id}`} className={buttonClass('secondary', 'sm')}><Images className="size-4" />Gallery</Link>}
              {event.certificatesAvailable && <Link href="/dashboard/certificates" className={buttonClass('secondary', 'sm')}><Award className="size-4" />Certificates</Link>}
              <Link href={href} className={buttonClass('secondary', 'sm', !event.resultsPublished && event.galleryCount === 0 ? 'col-span-2' : '')}>View Event</Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {canRegister ? (
                <Link href={`${href}/register`} className={buttonClass('accent', 'md', 'uppercase')}>Register</Link>
              ) : (
                <span className={buttonClass('secondary', 'md', 'pointer-events-none cursor-not-allowed text-[11px] uppercase opacity-70')} aria-disabled>{registrationLabel(event)}</span>
              )}
              <Link href={href} className={buttonClass('secondary', 'md', 'uppercase')}>View Details</Link>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
