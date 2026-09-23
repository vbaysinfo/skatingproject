import type { MetadataRoute } from 'next';
import { getEvents, getPrograms } from '@/lib/server/data';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  const statics = ['', '/about', '/events', '/programs', '/gallery', '/membership', '/rankings', '/contact', '/privacy', '/terms'].map((p) => ({
    url: base + p, changeFrequency: 'daily' as const, priority: p === '' ? 1 : 0.7,
  }));
  const [events, programs] = await Promise.all([getEvents({ pageSize: 200 }), getPrograms()]);
  return [
    ...statics,
    ...(events?.items || []).map((e) => ({ url: `${base}/events/${e.slug}`, changeFrequency: 'daily' as const, priority: 0.8 })),
    ...(programs?.items || []).map((p) => ({ url: `${base}/programs/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.6 })),
  ];
}
