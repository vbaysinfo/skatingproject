import type { Metadata } from 'next';
import { getSettings } from '@/lib/server/data';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = { title: 'Login', robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, settings] = await Promise.all([searchParams, getSettings()]);
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  return <LoginForm next={safeNext} googleClientId={settings.GOOGLE_CLIENT_ID} />;
}
