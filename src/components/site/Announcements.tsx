import Link from 'next/link';
import { Megaphone, ArrowRight } from 'lucide-react';
import type { Announcement, Sponsor } from '@/lib/types';
import { cn, formatDate } from '@/lib/format';

export function AnnouncementCard({ a, className }: { a: Announcement; className?: string }) {
  const high = a.priority === 'HIGH' || a.priority === 'URGENT';
  const body = (
    <>
      <div className="flex items-center gap-2">
        <span className={cn('grid size-9 place-items-center rounded-xl', high ? 'bg-accent-500 text-white' : 'bg-brand-50 text-brand-600')}><Megaphone className="size-4" aria-hidden /></span>
        <span className="text-[11px] font-bold uppercase tracking-widest text-muted">{formatDate(a.publishDate)}</span>
        {high && <span className="ml-auto rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-accent-700">Important</span>}
      </div>
      <h3 className="mt-4 font-display text-xl font-bold uppercase leading-tight">{a.title}</h3>
      <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{a.description}</p>
      {a.linkUrl && <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-700">Read more <ArrowRight className="size-4" aria-hidden /></span>}
    </>
  );
  const cls = cn('block h-full rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)] ring-1 ring-line/70 transition hover:-translate-y-0.5', className);
  if (!a.linkUrl) return <article className={cls}>{body}</article>;
  return a.linkUrl.startsWith('/') ? <Link href={a.linkUrl} className={cls}>{body}</Link>
    : <a href={a.linkUrl} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a>;
}

export function SponsorStrip({ sponsors, className }: { sponsors: Sponsor[]; className?: string }) {
  if (!sponsors.length) return null;
  return (
    <ul className={cn('grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5', className)}>
      {sponsors.map((s) => {
        const inner = s.logoUrl ? <img src={s.logoUrl} alt={s.name} loading="lazy" className="max-h-12 w-auto max-w-full object-contain grayscale transition group-hover:grayscale-0" />
          : <span className="font-display text-lg font-bold uppercase tracking-wide text-ink-soft group-hover:text-brand-700">{s.name}</span>;
        const cls = 'group flex h-24 flex-col items-center justify-center gap-1 rounded-2xl bg-white px-4 text-center ring-1 ring-line/80 transition hover:ring-brand-300';
        return (
          <li key={s.id}>
            {s.websiteUrl ? <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer" className={cls} aria-label={s.name}>{inner}{s.tier && <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{s.tier}</span>}</a>
              : <div className={cls}>{inner}{s.tier && <span className="text-[10px] font-bold uppercase tracking-widest text-muted">{s.tier}</span>}</div>}
          </li>
        );
      })}
    </ul>
  );
}
