import Link from 'next/link';
import { Clock, MapPin, BadgeCheck } from 'lucide-react';
import type { Program } from '@/lib/types';
import { cn, formatMoney, labelize } from '@/lib/format';
import { buttonClass } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PosterArt } from '@/components/events/PosterArt';

export function ProgramCard({ program, className }: { program: Program; className?: string }) {
  const href = `/programs/${program.slug}`;
  const open = program.registrationStatus === 'OPEN';
  return (
    <article className={cn('group flex flex-col overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)] ring-1 ring-line/70 transition hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]', className)}>
      <Link href={href} className="relative block aspect-[16/10] overflow-hidden" tabIndex={-1} aria-hidden>
        {program.imageUrl ? <img src={program.imageUrl} alt="" loading="lazy" className="size-full object-cover transition duration-500 group-hover:scale-[1.04]" />
          : <PosterArt title={program.name} kicker={labelize(program.type)} className="size-full" />}
        <Badge tone="dark" className="absolute left-3.5 top-3.5">{labelize(program.type)}</Badge>
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-[22px] font-bold uppercase leading-tight"><Link href={href} className="hover:text-brand-700">{program.name}</Link></h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{program.shortDescription}</p>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-ink-soft">
          {program.duration && <li className="flex items-center gap-1.5"><Clock className="size-4 text-brand-500" aria-hidden />{program.duration}</li>}
          {program.location && <li className="flex items-center gap-1.5"><MapPin className="size-4 text-brand-500" aria-hidden />{program.location}</li>}
          {program.certification && <li className="flex items-center gap-1.5"><BadgeCheck className="size-4 text-brand-500" aria-hidden />Certification</li>}
        </ul>
        <div className="mt-auto flex items-center justify-between gap-3 pt-5">
          <p className="font-display text-2xl font-bold">{formatMoney(program.fee)}</p>
          <div className="flex gap-2">
            <Link href={href} className={buttonClass('secondary', 'sm')}>View Program</Link>
            {open ? <Link href={`${href}#register`} className={buttonClass('accent', 'sm')}>Register</Link>
              : <Link href={`/contact?subject=${encodeURIComponent('Enquiry: ' + program.name)}`} className={buttonClass('primary', 'sm')}>Enquire</Link>}
          </div>
        </div>
      </div>
    </article>
  );
}
