import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSettings } from '@/lib/server/data';
import { getCurrentUser } from '@/lib/server/session';
import { StudentShell } from './StudentShell';
import { SettingsProvider } from '@/components/portal/SettingsContext';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { default: 'My Dashboard', template: '%s | My Dashboard' }, robots: { index: false } };

/** Student portal: the session is validated by Apps Script on every page load. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  if (!user) redirect('/login?next=/dashboard');
  if (user.role === 'ADMIN') redirect('/admin');
  return (
    <SettingsProvider settings={settings}>
      <StudentShell user={user} siteName={settings.SITE_NAME} logoUrl={settings.SITE_LOGO}>{children}</StudentShell>
    </SettingsProvider>
  );
}
