import type { ReactNode } from 'react';
import { Trophy, CalendarCheck, BadgeCheck } from 'lucide-react';

/** Split layout used by login / register screens. */
export function AuthShell({ title, subtitle, children, wide }: { title: string; subtitle?: ReactNode; children: ReactNode; wide?: boolean }) {
  return (
    <div className="grid min-h-[calc(100dvh-72px)] lg:grid-cols-[0.9fr_1.1fr]">
      <aside className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <img src="/images/hero-rink.svg" alt="" className="absolute inset-0 size-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/40 to-transparent" aria-hidden />
        <div className="relative">
          <p className="text-[12px] font-bold uppercase tracking-[0.25em] text-accent-400">Athlete portal</p>
          <p className="mt-4 max-w-md font-display text-5xl font-extrabold uppercase leading-[0.92]">One profile. Every race. Every result.</p>
        </div>
        <ul className="relative space-y-4 text-sm text-white/85">
          <li className="flex gap-3"><CalendarCheck className="size-5 text-accent-400" aria-hidden />Register for championships in minutes</li>
          <li className="flex gap-3"><Trophy className="size-5 text-accent-400" aria-hidden />Results, rankings, medals and personal bests</li>
          <li className="flex gap-3"><BadgeCheck className="size-5 text-accent-400" aria-hidden />Digital membership card and verifiable certificates</li>
        </ul>
      </aside>
      <div className="flex items-start justify-center bg-surface px-4 py-10 sm:py-16">
        <div className={wide ? 'w-full max-w-3xl' : 'w-full max-w-md'}>
          <h1 className="font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">{title}</h1>
          {subtitle && <div className="mt-3 text-[15px] text-muted">{subtitle}</div>}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
