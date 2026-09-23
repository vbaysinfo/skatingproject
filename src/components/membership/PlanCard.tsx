import Link from 'next/link';
import { Check, Star } from 'lucide-react';
import type { Plan } from '@/lib/types';
import { cn, formatMoney } from '@/lib/format';
import { buttonClass } from '@/components/ui/Button';

export function PlanCard({ plan, className }: { plan: Plan; className?: string }) {
  const period = plan.durationMonths === 12 ? 'year' : plan.durationMonths + ' months';
  return (
    <article className={cn('relative flex flex-col rounded-[var(--radius-card)] p-7 ring-1 transition hover:-translate-y-1',
      plan.featured ? 'bg-ink text-white shadow-[var(--shadow-lift)] ring-ink' : 'bg-white shadow-[var(--shadow-card)] ring-line/70', className)}>
      {plan.featured && (
        <span className="absolute -top-3 left-7 inline-flex items-center gap-1 rounded-full bg-accent-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white">
          <Star className="size-3" fill="currentColor" aria-hidden />Most popular
        </span>
      )}
      <p className={cn('text-[12px] font-bold uppercase tracking-[0.2em]', plan.featured ? 'text-accent-400' : 'text-accent-600')}>{plan.type}</p>
      <h3 className="mt-2 font-display text-3xl font-extrabold uppercase leading-none">{plan.name}</h3>
      {plan.description && <p className={cn('mt-3 text-sm', plan.featured ? 'text-white/70' : 'text-muted')}>{plan.description}</p>}
      <p className="mt-6 flex items-baseline gap-1.5">
        <span className="font-display text-5xl font-extrabold">{formatMoney(plan.fee)}</span>
        {plan.fee > 0 && <span className={cn('text-sm font-semibold', plan.featured ? 'text-white/60' : 'text-muted')}>/ {period}</span>}
      </p>
      <ul className="mt-6 space-y-3 text-sm">
        {plan.benefits.map((b) => (
          <li key={b} className="flex gap-3">
            <span className={cn('grid size-5 shrink-0 place-items-center rounded-full', plan.featured ? 'bg-accent-500 text-white' : 'bg-brand-50 text-brand-600')}><Check className="size-3.5" aria-hidden /></span>
            {b}
          </li>
        ))}
      </ul>
      {plan.eligibility && <p className={cn('mt-5 text-xs', plan.featured ? 'text-white/55' : 'text-muted')}>Eligibility: {plan.eligibility}</p>}
      <Link href={`/membership/apply?plan=${plan.id}`} className={buttonClass(plan.featured ? 'accent' : 'primary', 'lg', 'mt-7 w-full uppercase')}>Become a member</Link>
    </article>
  );
}
