import type { MetadataRoute } from 'next';
import { getSettings } from '@/lib/server/data';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();
  return {
    name: s.SITE_NAME,
    short_name: s.SITE_SHORT_NAME || s.SITE_NAME.split(' ')[0],
    description: s.SITE_TAGLINE,
    start_url: '/',
    display: 'standalone',
    background_color: '#0a1628',
    theme_color: '#0a1628',
    icons: [
      { src: '/pwa-icon/192', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png' },
      { src: '/pwa-icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
