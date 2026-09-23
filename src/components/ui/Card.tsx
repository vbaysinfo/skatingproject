import type { ReactNode } from 'react';
import { cn } from '@/lib/format';

export function Card({ children, className, as: Tag = 'div' }: { children: ReactNode; className?: string; as?: 'div' | 'section' | 'article' }) {
  return <Tag className={cn('rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)] ring-1 ring-line/70', className)}>{children}</Tag>;
}

export function CardHeader({ title, subtitle, action, className }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-3 border-b border-line/80 px-5 py-4 sm:px-6', className)}>
      <div>
        <h2 className="font-display text-lg font-bold uppercase tracking-wide text-ink">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({ label, value, icon, hint, tone = 'brand', className }: {
  label: string; value: ReactNode; icon?: ReactNode; hint?: ReactNode; tone?: 'brand' | 'accent' | 'green' | 'violet' | 'slate'; className?: string;
}) {
  const toneCls = {
    brand: 'bg-brand-50 text-brand-600', accent: 'bg-accent-50 text-accent-600', green: 'bg-emerald-50 text-emerald-600',
    violet: 'bg-violet-50 text-violet-600', slate: 'bg-slate-100 text-slate-600',
  }[tone];
  return (
    <div className={cn('rounded-2xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-line/70', className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">{label}</p>
        {icon && <span className={cn('grid size-9 shrink-0 place-items-center rounded-xl', toneCls)}>{icon}</span>}
      </div>
      <p className="mt-2 font-display text-3xl font-bold text-ink">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function SectionHeading({ eyebrow, title, subtitle, action, align = 'left', dark }: {
  eyebrow?: string; title: ReactNode; subtitle?: ReactNode; action?: ReactNode; align?: 'left' | 'center'; dark?: boolean;
}) {
  return (
    <div className={cn('mb-10 flex flex-wrap items-end justify-between gap-5', align === 'center' && 'flex-col items-center text-center')}>
      <div className={cn(align === 'center' && 'mx-auto max-w-2xl')}>
        {eyebrow && (
          <p className={cn('mb-3 inline-flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.2em]', dark ? 'text-accent-400' : 'text-accent-600')}>
            <span className="h-0.5 w-6 rounded bg-current" aria-hidden />
            {eyebrow}
          </p>
        )}
        <h2 className={cn('font-display text-4xl font-extrabold uppercase leading-[0.95] sm:text-5xl', dark ? 'text-white' : 'text-ink')}>{title}</h2>
        {subtitle && <p className={cn('mt-3 max-w-2xl text-[15px] leading-relaxed', dark ? 'text-white/70' : 'text-muted')}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}
