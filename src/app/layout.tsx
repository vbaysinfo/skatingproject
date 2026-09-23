import type { Metadata, Viewport } from 'next';
import { Inter, Barlow_Condensed } from 'next/font/google';
import { getSettings } from '@/lib/server/data';
import { ToastProvider } from '@/components/ui/Toast';
import { ServiceWorker } from '@/components/site/ServiceWorker';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const display = Barlow_Condensed({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display-face', display: 'swap' });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

/** Site title, description and OG image all come from the Settings sheet. */
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const description = s.SITE_TAGLINE || s.ABOUT_INTRO || 'Skating association';
  const image = s.HERO_IMAGE && /^https?:/.test(s.HERO_IMAGE) ? s.HERO_IMAGE : '/opengraph-image';
  return {
    metadataBase: new URL(siteUrl),
    title: { default: s.SITE_NAME, template: `%s | ${s.SITE_NAME}` },
    description,
    applicationName: s.SITE_NAME,
    manifest: '/manifest.webmanifest',
    openGraph: { type: 'website', siteName: s.SITE_NAME, title: s.SITE_NAME, description, images: [image] },
    twitter: { card: 'summary_large_image', title: s.SITE_NAME, description, images: [image] },
    icons: s.SITE_LOGO ? { icon: s.SITE_LOGO, apple: s.SITE_LOGO } : undefined,
  };
}

export const viewport: Viewport = { themeColor: '#0a1628', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${display.variable}`}>
      <body className="min-h-dvh">
        <ToastProvider>{children}</ToastProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
