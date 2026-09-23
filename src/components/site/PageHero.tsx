import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/** Dark banner used at the top of inner pages. */
export function PageHero({ title, eyebrow, subtitle, crumbs, children }: {
  title: ReactNode; eyebrow?: string; subtitle?: ReactNode; crumbs?: { label: string; href?: string }[]; children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="speed-lines absolute inset-0" aria-hidden />
      <div className="absolute -right-24 -top-24 size-96 rounded-full bg-brand-600/40 blur-3xl" aria-hidden />
      <div className="absolute -bottom-32 left-1/3 size-80 rounded-full bg-accent-500/20 blur-3xl" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
        {crumbs && (
          <nav aria-label="Breadcrumb" className="mb-5">
            <ol className="flex flex-wrap items-center gap-1 text-xs font-semibold uppercase tracking-wider text-white/60">
              <li><Link href="/" className="hover:text-white">Home</Link></li>
              {crumbs.map((c) => (
                <li key={c.label} className="flex items-center gap-1">
                  <ChevronRight className="size-3.5" aria-hidden />
                  {c.href ? <Link href={c.href} className="hover:text-white">{c.label}</Link> : <span aria-current="page" className="text-white/90">{c.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="mb-3 text-[12px] font-bold uppercase tracking-[0.25em] text-accent-400">{eyebrow}</p>}
        <h1 className="max-w-4xl font-display text-5xl font-extrabold uppercase leading-[0.92] sm:text-6xl">{title}</h1>
        {subtitle && <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/70">{subtitle}</p>}
        {children && <div className="mt-8">{children}</div>}
      </div>
    </section>
  );
}
