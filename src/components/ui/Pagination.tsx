import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/format';

function pages(current: number, total: number): (number | '…')[] {
  const out: (number | '…')[] = [];
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - current) <= 1) out.push(p);
    else if (out[out.length - 1] !== '…') out.push('…');
  }
  return out;
}

const item = 'grid h-10 min-w-10 place-items-center rounded-full px-3 text-sm font-semibold transition';

/** Link-based pagination (works without JavaScript). */
export function Pagination({ page, totalPages, hrefFor, className }: { page: number; totalPages: number; hrefFor: (p: number) => string; className?: string }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className={cn('mt-10 flex items-center justify-center gap-1.5', className)}>
      {page > 1 ? <Link href={hrefFor(page - 1)} className={cn(item, 'ring-1 ring-line hover:ring-brand-300')} aria-label="Previous page"><ChevronLeft className="size-4" /></Link> : null}
      {pages(page, totalPages).map((p, i) =>
        p === '…' ? <span key={'e' + i} className="px-1 text-muted">…</span> : (
          <Link key={p} href={hrefFor(p)} aria-current={p === page ? 'page' : undefined}
            className={cn(item, p === page ? 'bg-ink text-white' : 'text-ink-soft hover:bg-surface')}>{p}</Link>
        ))}
      {page < totalPages ? <Link href={hrefFor(page + 1)} className={cn(item, 'ring-1 ring-line hover:ring-brand-300')} aria-label="Next page"><ChevronRight className="size-4" /></Link> : null}
    </nav>
  );
}

/** Callback-based pagination for client components. */
export function PagerButtons({ page, totalPages, onPage, className }: { page: number; totalPages: number; onPage: (p: number) => void; className?: string }) {
  if (totalPages <= 1) return null;
  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-center gap-1.5', className)}>
      <button type="button" disabled={page <= 1} onClick={() => onPage(page - 1)} className={cn(item, 'ring-1 ring-line disabled:opacity-40')} aria-label="Previous page"><ChevronLeft className="size-4" /></button>
      {pages(page, totalPages).map((p, i) =>
        p === '…' ? <span key={'e' + i} className="px-1 text-muted">…</span> : (
          <button type="button" key={p} onClick={() => onPage(p)} aria-current={p === page ? 'page' : undefined}
            className={cn(item, p === page ? 'bg-ink text-white' : 'text-ink-soft hover:bg-surface')}>{p}</button>
        ))}
      <button type="button" disabled={page >= totalPages} onClick={() => onPage(page + 1)} className={cn(item, 'ring-1 ring-line disabled:opacity-40')} aria-label="Next page"><ChevronRight className="size-4" /></button>
    </nav>
  );
}
