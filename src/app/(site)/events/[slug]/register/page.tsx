import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getEvent, getSettings } from '@/lib/server/data';
import { getCurrentUser } from '@/lib/server/session';
import { Container } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';
import { RegisterFlow } from './RegisterFlow';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Event registration', robots: { index: false } };

export default async function RegisterPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [ev, user, settings] = await Promise.all([getEvent(slug), getCurrentUser(), getSettings()]);
  if (ev === null) notFound();
  if (!ev) return <Container className="py-24"><ErrorState /></Container>;
  const self = `/events/${ev.slug}/register`;
  if (!user) redirect(`/login?next=${encodeURIComponent(self)}`);
  if (user.role === 'ADMIN') {
    return <Container className="py-24"><ErrorState message="Administrators register athletes from the admin portal (Registrations → Add registration)." action={<ButtonLink href="/admin/registrations">Open admin portal</ButtonLink>} /></Container>;
  }
  if (user.needsProfile) redirect(`/dashboard/complete-profile?next=${encodeURIComponent(self)}`);
  return <RegisterFlow event={ev} currency={settings.DEFAULT_CURRENCY} />;
}
