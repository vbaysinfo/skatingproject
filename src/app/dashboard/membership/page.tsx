'use client';
import Link from 'next/link';
import { Printer, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDate, formatMoney } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorState, LoadingState, EmptyState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { MembershipCard } from '@/components/membership/MembershipCard';
import { useSettings } from '@/components/portal/SettingsContext';

export default function MyMembershipPage() {
  const settings = useSettings();
  const { data, error, loading } = useApi(() => api.getStudentMembership(), []);
  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error?.message} />;
  const current = data.memberships.find((m) => m.status === 'ACTIVE') || data.memberships[0];
  return (
    <>
      <PortalHeader title="My membership" subtitle="Your digital membership card — the QR code lets anyone verify your membership."
        action={current?.status === 'ACTIVE' ? <Button variant="secondary" onClick={() => window.print()} icon={<Printer className="size-4" />}>Print card</Button> : undefined} />
      {!current ? (
        <EmptyState title="You are not a member yet" message="Membership unlocks competition registration, a digital ID and certificates."
          action={<ButtonLink href="/membership">View membership plans</ButtonLink>} />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[auto_1fr]">
          <div className="space-y-4">
            <MembershipCard membership={current} student={data.student} siteName={settings.SITE_NAME} logoUrl={settings.SITE_LOGO} />
            {current.status === 'PENDING' && (
              <Card className="p-5">
                <p className="font-semibold">Application received</p>
                <p className="mt-1 text-sm text-muted">{current.remarks || 'Your membership is awaiting payment or approval.'}</p>
                {current.paymentId && <ButtonLink href={`/pay/${current.paymentId}?next=/dashboard/membership`} variant="accent" size="sm" className="mt-3" icon={<CreditCard className="size-4" />}>Complete payment</ButtonLink>}
              </Card>
            )}
            {(current.status === 'EXPIRED' || current.status === 'CANCELLED') && <ButtonLink href="/membership" variant="accent">Renew / apply again</ButtonLink>}
          </div>
          <Card className="no-print">
            <CardHeader title="Membership history" />
            <ul className="divide-y divide-line">
              {data.memberships.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <div>
                    <p className="font-semibold">{m.planName} <span className="font-mono text-xs text-muted">{m.membershipNumber || m.id}</span></p>
                    <p className="text-sm text-muted">{m.startDate ? `${formatDate(m.startDate)} – ${formatDate(m.expiryDate)}` : `Applied ${formatDate(m.createdAt)}`} · {formatMoney(m.fee)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={m.status} />
                    {m.membershipNumber && <Link href={`/verify/member/${m.membershipNumber}`} className="text-sm font-bold text-brand-700" target="_blank">Verify</Link>}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </>
  );
}
