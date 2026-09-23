import type { ReactNode } from 'react';
import { cn } from '@/lib/format';

export type Tone = 'brand' | 'accent' | 'green' | 'amber' | 'red' | 'slate' | 'dark' | 'violet';

const tones: Record<Tone, string> = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  accent: 'bg-accent-50 text-accent-700 ring-accent-100',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  dark: 'bg-ink/85 text-white ring-white/10 backdrop-blur',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
};

export function Badge({ tone = 'brand', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ring-1 ring-inset', tones[tone], className)}>
      {children}
    </span>
  );
}

/** Maps any status value used in the sheets to a colour. */
export function statusTone(status: string | null | undefined): Tone {
  const s = String(status || '').toUpperCase();
  if (['ACTIVE', 'PUBLISHED', 'CONFIRMED', 'SUCCESS', 'PAID', 'ISSUED', 'VALID', 'RESOLVED', 'FINISHED', 'OPEN', 'ONGOING'].includes(s)) return 'green';
  if (['PENDING', 'PENDING_PAYMENT', 'DRAFT', 'NEW', 'IN_PROGRESS', 'CONTACTED', 'NOT_OPEN', 'UPCOMING', 'WAITLISTED', 'NOT_REQUIRED'].includes(s)) return 'amber';
  if (['CANCELLED', 'FAILED', 'REVOKED', 'SUSPENDED', 'DSQ', 'DNF', 'FULL', 'REJECTED', 'DISABLED'].includes(s)) return 'red';
  if (['EXPIRED', 'ARCHIVED', 'PAST', 'CLOSED', 'INACTIVE', 'UNPUBLISHED', 'DNS', 'REFUNDED', 'HIDDEN'].includes(s)) return 'slate';
  return 'brand';
}

export function StatusBadge({ status, className }: { status: string | null | undefined; className?: string }) {
  if (!status) return null;
  return <Badge tone={statusTone(status)} className={className}>{String(status).replace(/_/g, ' ')}</Badge>;
}
