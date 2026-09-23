import type { Metadata } from 'next';
import { verifyMembership, getSettings } from '@/lib/server/data';
import { formatDate } from '@/lib/format';
import { VerifyResult } from '@/components/site/VerifyResult';

export const revalidate = 60;
export const metadata: Metadata = { title: 'Verify membership', robots: { index: false } };

export default async function VerifyMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, s] = await Promise.all([verifyMembership(decodeURIComponent(id)), getSettings()]);
  return (
    <VerifyResult kind="member" id={decodeURIComponent(id)} siteName={s.SITE_NAME} found={!!r?.found} valid={!!r?.valid} status={r?.status || ''} error={!r}
      rows={r?.found ? [['Name', r.name || ''], ['Membership type', r.membershipType || ''], ['Member ID', r.memberId || ''],
        ['Validity', `${formatDate(r.validFrom)} – ${formatDate(r.validUntil)}`], ['Status', r.status || '']] : []} />
  );
}
