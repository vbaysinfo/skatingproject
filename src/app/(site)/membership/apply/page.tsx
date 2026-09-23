import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getPlans } from '@/lib/server/data';
import { getCurrentUser } from '@/lib/server/session';
import { Container } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/States';
import { ButtonLink } from '@/components/ui/Button';
import { ApplyMembership } from './ApplyMembership';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Apply for membership', robots: { index: false } };

export default async function ApplyPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const { plan: planId } = await searchParams;
  const self = `/membership/apply${planId ? `?plan=${encodeURIComponent(planId)}` : ''}`;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(self)}`);
  if (user.role === 'ADMIN') redirect('/admin/memberships');
  if (user.needsProfile) redirect(`/dashboard/complete-profile?next=${encodeURIComponent(self)}`);
  const plans = (await getPlans()) || [];
  const plan = plans.find((p) => p.id === planId);
  if (!plan) {
    return <Container className="py-20"><EmptyState title="Choose a membership plan" action={<ButtonLink href="/membership">View plans</ButtonLink>} /></Container>;
  }
  return <ApplyMembership plan={plan} />;
}
