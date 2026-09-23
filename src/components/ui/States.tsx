import type { ReactNode } from 'react';
import { CircleAlert, Inbox } from 'lucide-react';
import { cn } from '@/lib/format';

export function Spinner({ className }: { className?: string }) {
  return <span role="status" aria-label="Loading" className={cn('inline-block size-5 animate-spin rounded-full border-2 border-brand-500 border-t-transparent', className)} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('skeleton', className)} />;
}

export function CardSkeletonGrid({ count = 6, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('grid gap-6 sm:grid-cols-2 lg:grid-cols-3', className)} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-[var(--radius-card)] ring-1 ring-line">
          <Skeleton className="aspect-[4/3] rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div className={cn('flex min-h-40 flex-col items-center justify-center gap-3 text-sm text-muted', className)} aria-live="polite">
      <Spinner />
      {label}
    </div>
  );
}

export function EmptyState({ title, message, action, icon, className }: { title: string; message?: string; action?: ReactNode; icon?: ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-line bg-surface/60 px-6 py-14 text-center', className)}>
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-white text-brand-500 shadow-[var(--shadow-card)]">{icon || <Inbox className="size-6" />}</div>
      <p className="font-display text-xl font-bold uppercase text-ink">{title}</p>
      {message && <p className="mt-1.5 max-w-md text-sm text-muted">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong. Please try again.', action, className }: { message?: string; action?: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn('flex flex-col items-center justify-center rounded-[var(--radius-card)] bg-red-50/70 px-6 py-12 text-center ring-1 ring-red-100', className)}>
      <CircleAlert className="mb-3 size-8 text-red-500" aria-hidden />
      <p className="font-semibold text-red-800">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
