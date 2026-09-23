import type { Metadata } from 'next';
import { verifyCertificate, getSettings } from '@/lib/server/data';
import { formatDate } from '@/lib/format';
import { VerifyResult } from '@/components/site/VerifyResult';

export const revalidate = 60;
export const metadata: Metadata = { title: 'Verify certificate', robots: { index: false } };

export default async function VerifyCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [r, s] = await Promise.all([verifyCertificate(decodeURIComponent(id)), getSettings()]);
  return (
    <VerifyResult kind="certificate" id={decodeURIComponent(id)} siteName={s.SITE_NAME} found={!!r?.found} valid={!!r?.valid} status={r?.status || ''} error={!r}
      rows={r?.found ? [['Certificate number', r.certificateNumber || ''], ['Student name', r.studentName || ''], ['Event', r.event || r.certification || '—'],
        ['Achievement', r.achievement || ''], ['Issue date', formatDate(r.issueDate)], ['Verification status', r.status || '']] : []} />
  );
}
