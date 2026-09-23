import type { Metadata } from 'next';
import { getSettings } from '@/lib/server/data';
import { RegisterForm } from './RegisterForm';

export const metadata: Metadata = { title: 'Create athlete account', description: 'Register as an athlete to enter events, apply for membership and track your results.' };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [{ next }, settings] = await Promise.all([searchParams, getSettings()]);
  const safeNext = next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';
  return <RegisterForm next={safeNext} googleClientId={settings.GOOGLE_CLIENT_ID} siteName={settings.SITE_NAME} />;
}
