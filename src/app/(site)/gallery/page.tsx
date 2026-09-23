import type { Metadata } from 'next';
import Link from 'next/link';
import { getGallery, getVideos } from '@/lib/server/data';
import { cn, labelize } from '@/lib/format';
import { PageHero } from '@/components/site/PageHero';
import { Container } from '@/components/ui/Card';
import { LinkTabs } from '@/components/ui/Tabs';
import { Pagination } from '@/components/ui/Pagination';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { GalleryGrid } from '@/components/gallery/GalleryGrid';
import { VideoGrid } from '@/components/gallery/VideoGrid';
import { callGas } from '@/lib/server/gas';
import type { GalleryItem, Page } from '@/lib/types';

export const revalidate = 60;
export const metadata: Metadata = { title: 'Gallery', description: 'Photos and videos from championships, training and award ceremonies.' };

type SP = Promise<{ tab?: string; category?: string; page?: string; event?: string }>;

export default async function GalleryPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const tab = sp.tab === 'videos' ? 'videos' : 'photos';
  const category = (sp.category || 'ALL').toUpperCase();
  const page = Number(sp.page) || 1;
  const href = (p: Record<string, string | number | undefined>) => {
    const m = { tab, category, page, event: sp.event, ...p };
    const params = new URLSearchParams();
    Object.entries(m).forEach(([k, v]) => { if (v && !(k === 'tab' && v === 'photos') && !(k === 'category' && v === 'ALL') && !(k === 'page' && v === 1)) params.set(k, String(v)); });
    return '/gallery' + (params.toString() ? '?' + params : '');
  };

  let content: React.ReactNode;
  let categories: string[] = [];
  if (tab === 'photos') {
    const data = sp.event
      ? await callGas<Page<GalleryItem> & { categories: string[] }>('getGallery', { eventId: sp.event, page }, { cacheable: true }).then((r) => (r.success ? r.data : null))
      : await getGallery(category === 'ALL' ? undefined : category, page);
    categories = data?.categories || [];
    content = !data ? <ErrorState /> : data.items.length ? (
      <><GalleryGrid items={data.items} /><Pagination page={data.page} totalPages={data.totalPages} hrefFor={(p) => href({ page: p })} /></>
    ) : <EmptyState title="No photos yet" message="Photos appear here as soon as they are published." />;
  } else {
    const data = await getVideos(category === 'ALL' ? undefined : category);
    categories = data?.categories || [];
    content = !data ? <ErrorState /> : data.items.length ? <VideoGrid videos={data.items} /> : <EmptyState title="No videos yet" />;
  }

  return (
    <>
      <PageHero eyebrow="Moments" title="Gallery" subtitle="Race days, training sessions and podium moments." crumbs={[{ label: 'Gallery' }]}>
        <LinkTabs tabs={[{ key: 'photos', label: 'Photos', href: href({ tab: 'photos', category: 'ALL', page: 1 }) }, { key: 'videos', label: 'Videos', href: href({ tab: 'videos', category: 'ALL', page: 1, event: undefined }) }]}
          active={tab} className="bg-white/10 ring-white/15 [&_a:not([aria-selected=true])]:text-white/70" />
      </PageHero>
      <Container className="py-10 sm:py-14">
        {sp.event ? (
          <p className="mb-6 text-sm text-muted">Showing photos from one event. <Link href="/gallery" className="font-bold text-brand-700 hover:underline">Show all photos</Link></p>
        ) : (
          <nav aria-label="Gallery category" className="scrollbar-none -mx-4 mb-8 flex gap-2 overflow-x-auto px-4">
            {['ALL', ...categories].map((c) => (
              <Link key={c} href={href({ category: c, page: 1 })} aria-current={category === c ? 'true' : undefined}
                className={cn('shrink-0 rounded-full px-4 py-2 text-[12px] font-bold uppercase tracking-wider ring-1', category === c ? 'bg-brand-600 text-white ring-brand-600' : 'bg-white text-ink-soft ring-line hover:ring-brand-300')}>
                {c === 'ALL' ? 'All' : labelize(c)}
              </Link>
            ))}
          </nav>
        )}
        {content}
      </Container>
    </>
  );
}
