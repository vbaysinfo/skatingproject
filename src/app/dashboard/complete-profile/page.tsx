'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { StudentFields, EMPTY_STUDENT, ageFromDob, type StudentForm } from '@/components/portal/StudentFields';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, FormError, Input } from '@/components/ui/Form';
import { LoadingState } from '@/components/ui/States';

function CompleteProfileInner() {
  const router = useRouter();
  const next = useSearchParams().get('next');
  const [form, setForm] = useState<StudentForm>(EMPTY_STUDENT);
  const [accept, setAccept] = useState(false);
  const [guardian, setGuardian] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const age = ageFromDob(form.dob);
  const minor = age !== null && age < 18;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api.completeProfile({ ...form, acceptTerms: accept, guardianConsentName: minor ? guardian : '' });
      router.replace(next && next.startsWith('/') && !next.startsWith('//') ? next : '/dashboard?welcome=1');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <>
      <PortalHeader title="Complete your athlete profile" subtitle="One last step — we need a few details to create your Student ID." />
      <Card className="max-w-4xl p-6 sm:p-8">
        <form onSubmit={submit} className="space-y-8">
          <StudentFields value={form} onChange={setForm} showEmail={false} />
          <div className="space-y-4 rounded-2xl bg-surface p-5">
            <Checkbox checked={accept} onChange={(e) => setAccept(e.target.checked)} required
              label={<>I agree to the <Link href="/terms" target="_blank" className="font-semibold text-brand-700 underline">terms and conditions</Link>.</>} />
            {minor && <Field label="Parent / guardian consent — full name" htmlFor="g" required><Input id="g" value={guardian} onChange={(e) => setGuardian(e.target.value)} required /></Field>}
          </div>
          <FormError message={error} />
          <Button type="submit" size="lg" variant="accent" loading={busy}>Create my athlete profile</Button>
        </form>
      </Card>
    </>
  );
}

export default function CompleteProfilePage() {
  return <Suspense fallback={<LoadingState />}><CompleteProfileInner /></Suspense>;
}
