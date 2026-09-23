import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSettings } from '@/lib/server/data';
import { getCurrentUser } from '@/lib/server/session';
import { SettingsProvider } from '@/components/portal/SettingsContext';
import { AdminShell } from './AdminShell';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: { default: 'Admin', template: '%s | Admin' }, robots: { index: false } };

/** Every admin page re-validates the session and ADMIN role with Apps Script. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  if (!user || user.role !== 'ADMIN') redirect('/admin/login');
  return (
    <SettingsProvider settings={settings}>
      <AdminShell user={user} siteName={settings.SITE_NAME} logoUrl={settings.SITE_LOGO}>{children}</AdminShell>
    </SettingsProvider>
  );
}
