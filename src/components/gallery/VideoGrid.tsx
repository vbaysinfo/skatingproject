'use client';
import { useState } from 'react';
import { Play } from 'lucide-react';
import type { Video } from '@/lib/types';
import { labelize } from '@/lib/format';
import { Modal } from '@/components/ui/Modal';
import { PosterArt } from '@/components/events/PosterArt';

export function VideoGrid({ videos }: { videos: Video[] }) {
  const [active, setActive] = useState<Video | null>(null);
  return (
    <>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map((v) => (
          <li key={v.id}>
            <button type="button" onClick={() => setActive(v)} className="group block w-full overflow-hidden rounded-[var(--radius-card)] bg-white text-left shadow-[var(--shadow-card)] ring-1 ring-line/70">
              <span className="relative block aspect-video overflow-hidden bg-ink">
                {v.thumbnailUrl ? <img src={v.thumbnailUrl} alt="" loading="lazy" className="size-full object-cover opacity-90 transition group-hover:scale-105" />
                  : <PosterArt title={v.title} kicker={labelize(v.category)} className="size-full" />}
                <span className="absolute inset-0 grid place-items-center">
                  <span className="grid size-16 place-items-center rounded-full bg-accent-500 text-white shadow-xl transition group-hover:scale-110"><Play className="ml-1 size-7" fill="currentColor" aria-hidden /></span>
                </span>
              </span>
              <span className="block p-4">
                <span className="text-[11px] font-bold uppercase tracking-widest text-accent-600">{labelize(v.category)}</span>
                <span className="mt-1 block font-display text-xl font-bold uppercase leading-tight">{v.title}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <Modal open={!!active} onClose={() => setActive(null)} title={active?.title || ''} size="xl">
        {active && (
          <div className="aspect-video overflow-hidden rounded-xl bg-black">
            <iframe src={active.embedUrl} title={active.title} className="size-full" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        )}
      </Modal>
    </>
  );
}
