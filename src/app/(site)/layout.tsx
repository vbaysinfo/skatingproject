import { getSettings } from '@/lib/server/data';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <Header siteName={settings.SITE_NAME} logoUrl={settings.SITE_LOGO} />
      <main id="main" className="min-h-[60vh]">{children}</main>
      <Footer settings={settings} />
    </>
  );
}
