'use client';
import Link from 'next/link';
import { Award, Download, ShieldCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDate } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { ErrorState, EmptyState, CardSkeletonGrid } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { QrCode } from '@/components/membership/QrCode';

export default function MyCertificatesPage() {
  const { data, error, loading } = useApi(() => api.getStudentCertificates(), []);
  if (error) return <ErrorState message={error.message} />;
  return (
    <>
      <PortalHeader title="My certificates" subtitle="Download your certificates or share the verification link — each one can be verified publicly." />
      {loading ? <CardSkeletonGrid count={3} /> : !data?.length ? <EmptyState title="No certificates available." message="Certificates are issued after events and certification programs." icon={<Award className="size-6" />} /> : (
        <div className="grid gap-5 md:grid-cols-2 2xl:grid-cols-3">
          {data.map((c) => (
            <Card key={c.id} className="flex flex-col overflow-hidden">
              <div className="flex items-start justify-between gap-4 bg-gradient-to-br from-brand-700 to-ink p-5 text-white">
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-accent-400">{c.type || 'Certificate'}</p>
                  <p className="mt-1 font-display text-2xl font-extrabold uppercase leading-tight">{c.title}</p>
                  <p className="mt-2 text-sm text-white/75">{c.eventName || c.certificationName}</p>
                </div>
                <QrCode value={c.verifyUrl} size={76} className="shrink-0 p-1" label={'Verify ' + c.certificateNumber} />
              </div>
              <dl className="grid grid-cols-2 gap-3 p-5 text-sm">
                <div><dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Number</dt><dd className="font-mono font-semibold">{c.certificateNumber}</dd></div>
                <div><dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Issued</dt><dd className="font-semibold">{formatDate(c.issueDate)}</dd></div>
                <div><dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Code</dt><dd className="font-mono font-semibold">{c.verificationCode}</dd></div>
                <div><dt className="text-[11px] font-bold uppercase tracking-wider text-muted">Status</dt><dd><StatusBadge status={c.status} /></dd></div>
              </dl>
              <div className="mt-auto flex gap-2 border-t border-line p-4">
                {c.certificateUrl && c.status === 'ISSUED' ? <a href={c.certificateUrl} target="_blank" rel="noopener noreferrer" className={buttonClass('primary', 'sm', 'flex-1')}><Download className="size-4" />View / Download</a>
                  : <span className="flex-1 text-xs text-muted">{c.status === 'ISSUED' ? 'PDF is being prepared' : ''}</span>}
                <Link href={`/verify/certificate/${c.certificateNumber}`} target="_blank" className={buttonClass('secondary', 'sm')}><ShieldCheck className="size-4" />Verify</Link>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
