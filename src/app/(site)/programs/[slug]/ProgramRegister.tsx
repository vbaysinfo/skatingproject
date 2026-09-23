'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { Button, buttonClass } from '@/components/ui/Button';
import { FormError, FormSuccess } from '@/components/ui/Form';

export function ProgramRegister({ programId, programName, open }: { programId: string; programName: string; open: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function register() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.registerProgram(programId);
      if (r.nextStep === 'PAYMENT') router.push(`/pay/${r.payment.id}?next=/dashboard/registrations`);
      else setDone('You are registered! See My Registrations in your dashboard.');
    } catch (e) {
      if (e instanceof ApiError && (e.code === 'UNAUTHORIZED' || e.code === 'PROFILE_REQUIRED')) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + '#register')}`);
        return;
      }
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-3">
      {open && !done && <Button variant="accent" size="lg" className="w-full uppercase" loading={busy} onClick={register}>Register</Button>}
      {!open && <p className="rounded-xl bg-surface px-4 py-3 text-center text-sm font-semibold text-muted">Registration is currently closed</p>}
      <Link href={`/contact?subject=${encodeURIComponent('Enquiry: ' + programName)}`} className={buttonClass('secondary', 'lg', 'w-full uppercase')}>Enquire</Link>
      <FormError message={error} />
      <FormSuccess message={done} />
    </div>
  );
}
