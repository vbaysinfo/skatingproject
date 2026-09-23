'use client';
import type { Membership, StudentProfile } from '@/lib/types';
import { cn, formatDate, initials } from '@/lib/format';
import { LogoMark } from '@/components/site/Logo';
import { QrCode } from './QrCode';

/** Digital membership card (spec §22). The QR opens /verify/member/{number}. */
export function MembershipCard({ membership, student, siteName, logoUrl, className }: {
  membership: Membership; student: Pick<StudentProfile, 'fullName' | 'photoUrl' | 'id'>; siteName: string; logoUrl?: string; className?: string;
}) {
  const verifyUrl = membership.verifyUrl || (typeof window !== 'undefined' ? `${window.location.origin}/verify/member/${membership.membershipNumber}` : '');
  const active = membership.status === 'ACTIVE';
  return (
    <div className={cn('relative w-full max-w-[460px] overflow-hidden rounded-[26px] bg-gradient-to-br from-brand-800 via-brand-700 to-ink p-6 text-white shadow-[var(--shadow-lift)]', className)}>
      <div className="speed-lines absolute inset-0" aria-hidden />
      <div className="absolute -right-10 -top-16 size-56 rounded-full bg-accent-500/30 blur-2xl" aria-hidden />
      <div className="relative">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <LogoMark logoUrl={logoUrl} className="size-9 bg-white/10" />
            <p className="truncate font-display text-sm font-bold uppercase tracking-wider">{siteName}</p>
          </div>
          <span className={cn('shrink-0 rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-widest', active ? 'bg-emerald-400 text-emerald-950' : 'bg-white/20 text-white')}>{membership.status}</span>
        </div>
        <div className="mt-6 flex gap-4">
          {student.photoUrl ? <img src={student.photoUrl} alt="" className="size-20 shrink-0 rounded-2xl object-cover ring-2 ring-white/30" />
            : <span className="grid size-20 shrink-0 place-items-center rounded-2xl bg-white/15 font-display text-2xl font-bold" aria-hidden>{initials(student.fullName)}</span>}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent-400">{membership.planName || 'Member'}</p>
            <p className="mt-1 font-display text-[28px] font-extrabold uppercase leading-[0.95]">{student.fullName}</p>
            <p className="mt-2 font-mono text-sm tracking-wider text-white/85">{membership.membershipNumber || 'Pending approval'}</p>
          </div>
        </div>
        <div className="mt-6 flex items-end justify-between gap-4">
          <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs">
            <div><dt className="text-white/55 uppercase tracking-wider">Valid from</dt><dd className="font-semibold">{formatDate(membership.startDate) || '—'}</dd></div>
            <div><dt className="text-white/55 uppercase tracking-wider">Valid until</dt><dd className="font-semibold">{formatDate(membership.expiryDate) || '—'}</dd></div>
            <div className="col-span-2"><dt className="text-white/55 uppercase tracking-wider">Member type</dt><dd className="font-semibold">{membership.planType || membership.planName}</dd></div>
          </dl>
          {membership.membershipNumber && verifyUrl && <QrCode value={verifyUrl} size={92} className="p-1.5" label={'Verify membership ' + membership.membershipNumber} />}
        </div>
      </div>
    </div>
  );
}
