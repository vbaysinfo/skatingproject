'use client';
import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, X, Expand } from 'lucide-react';
import type { GalleryItem } from '@/lib/types';
import { cn, labelize } from '@/lib/format';

/** Masonry grid with an accessible keyboard-navigable lightbox. Images lazy-load. */
export function GalleryGrid({ items, className }: { items: GalleryItem[]; className?: string }) {
  const [index, setIndex] = useState<number | null>(null);
  const close = useCallback(() => setIndex(null), []);
  const step = useCallback((d: number) => setIndex((i) => (i === null ? null : (i + d + items.length) % items.length)), [items.length]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [index, close, step]);

  const current = index !== null ? items[index] : null;
  return (
    <>
      <ul className={cn('columns-2 gap-3 sm:gap-4 md:columns-3 lg:columns-4', className)}>
        {items.map((g, i) => (
          <li key={g.id} className="mb-3 break-inside-avoid sm:mb-4">
            <button type="button" onClick={() => setIndex(i)} className="group relative block w-full overflow-hidden rounded-2xl bg-surface text-left" aria-label={'Open image: ' + g.title}>
              <img src={g.thumbUrl} alt={g.title} loading="lazy" decoding="async" className="w-full object-cover transition duration-500 group-hover:scale-[1.05]" />
              <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/80 via-ink/10 to-transparent p-3 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                <span className="text-[10px] font-bold uppercase tracking-widest text-accent-400">{labelize(g.category)}</span>
                <span className="text-sm font-semibold text-white">{g.title}</span>
              </span>
              <Expand className="absolute right-2.5 top-2.5 size-8 rounded-full bg-white/90 p-2 text-ink opacity-0 transition group-hover:opacity-100" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      {current && (
        <div role="dialog" aria-modal="true" aria-label={current.title} className="fixed inset-0 z-[90] flex flex-col bg-ink/95 backdrop-blur" onClick={close}>
          <div className="flex items-center justify-between gap-4 p-4 text-white" onClick={(e) => e.stopPropagation()}>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-widest text-accent-400">{labelize(current.category)} · {index! + 1} / {items.length}</p>
              <p className="truncate font-semibold">{current.title}</p>
            </div>
            <button type="button" onClick={close} className="grid size-11 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Close"><X className="size-5" /></button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 pb-6" onClick={(e) => e.stopPropagation()}>
            <img src={current.imageUrl} alt={current.title} className="max-h-full max-w-full rounded-xl object-contain shadow-2xl" />
            {items.length > 1 && (
              <>
                <button type="button" onClick={() => step(-1)} className="absolute left-3 grid size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25 sm:left-6" aria-label="Previous image"><ChevronLeft /></button>
                <button type="button" onClick={() => step(1)} className="absolute right-3 grid size-12 place-items-center rounded-full bg-white/10 text-white hover:bg-white/25 sm:right-6" aria-label="Next image"><ChevronRight /></button>
              </>
            )}
          </div>
          {current.description && current.description !== 'Sample image' && <p className="px-6 pb-6 text-center text-sm text-white/70">{current.description}</p>}
        </div>
      )}
    </>
  );
}
