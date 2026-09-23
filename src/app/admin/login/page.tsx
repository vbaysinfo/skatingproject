import type { Metadata } from 'next';
import { getSettings } from '@/lib/server/data';
import { AdminLoginForm } from './AdminLoginForm';

export const metadata: Metadata = { title: 'Admin login', robots: { index: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, s] = await Promise.all([searchParams, getSettings()]);
  const safe = next && next.startsWith('/admin') ? next : '/admin';
  return <AdminLoginForm next={safe} siteName={s.SITE_NAME} logoUrl={s.SITE_LOGO} googleClientId={s.GOOGLE_CLIENT_ID} />;
}
