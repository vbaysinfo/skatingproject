'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Camera, Save, KeyRound } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { IMAGE_TYPES, toFilePayload } from '@/lib/files';
import { formatDate, initials } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { StudentFields, type StudentForm, EMPTY_STUDENT } from '@/components/portal/StudentFields';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, FormError, Input } from '@/components/ui/Form';
import { LoadingState, ErrorState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';

function ProfileInner() {
  const toast = useToast();
  const router = useRouter();
  const next = useSearchParams().get('next');
  const { data, error, loading, setData } = useApi(() => api.getStudentProfile(), []);
  const [form, setForm] = useState<StudentForm>(EMPTY_STUDENT);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pw, setPw] = useState({ current: '', next: '' });

  useEffect(() => {
    if (!data) return;
    const f = { ...EMPTY_STUDENT };
    (Object.keys(f) as (keyof StudentForm)[]).forEach((k) => { f[k] = String((data as unknown as Record<string, unknown>)[k] ?? ''); });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(f);
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const { email: _email, ...rest } = form;
      void _email;
      const updated = await api.updateStudentProfile({ ...rest, updatedAt: data?.updatedAt });
      setData(updated);
      toast('Profile saved');
      if (next && next.startsWith('/') && !next.startsWith('//')) router.push(next);
    } catch (e2) {
      setErr(e2 instanceof ApiError ? e2.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function photo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const file = await toFilePayload(f, { allowed: IMAGE_TYPES, maxSide: 800 });
      setData(await api.updateStudentProfile({ photo: file, updatedAt: data?.updatedAt }));
      toast('Photo updated');
    } catch (e2) {
      toast(e2 instanceof Error ? e2.message : 'Upload failed', 'error');
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    try {
      await api.changePassword(pw.current, pw.next);
      setPw({ current: '', next: '' });
      toast('Password changed');
    } catch (e2) {
      toast(e2 instanceof ApiError ? e2.message : 'Could not change password', 'error');
    }
  }

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error?.message} />;
  return (
    <>
      <PortalHeader title="My profile" subtitle="Keep your details up to date — they appear on registrations and certificates." />
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <div className="space-y-6">
          <Card className="p-6 text-center">
            {data.photoUrl ? <img src={data.photoUrl} alt="" className="mx-auto size-28 rounded-3xl object-cover" />
              : <span className="mx-auto grid size-28 place-items-center rounded-3xl bg-brand-600 font-display text-4xl font-bold text-white">{initials(data.fullName)}</span>}
            <p className="mt-4 font-display text-2xl font-bold uppercase">{data.fullName}</p>
            <p className="font-mono text-sm text-muted">{data.id}</p>
            <div className="mt-2"><StatusBadge status={data.status} /></div>
            <label className="mt-5 inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-4 text-sm font-semibold ring-1 ring-line hover:ring-brand-300">
              <Camera className="size-4" />Change photo<input type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" onChange={photo} />
            </label>
            <dl className="mt-6 space-y-2 border-t border-line pt-4 text-left text-sm">
              <div className="flex justify-between"><dt className="text-muted">Email</dt><dd className="font-medium">{data.email}</dd></div>
              <div className="flex justify-between"><dt className="text-muted">Member since</dt><dd className="font-medium">{formatDate(data.createdAt)}</dd></div>
              {data.guardianConsentName && <div className="flex justify-between gap-2"><dt className="text-muted">Guardian consent</dt><dd className="text-right font-medium">{data.guardianConsentName}</dd></div>}
            </dl>
          </Card>
          <Card>
            <CardHeader title="Password" />
            <form onSubmit={changePassword} className="space-y-3 p-5">
              <Field label="Current password" htmlFor="cp"><Input id="cp" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} autoComplete="current-password" /></Field>
              <Field label="New password" htmlFor="np"><Input id="np" type="password" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} minLength={8} required autoComplete="new-password" /></Field>
              <Button type="submit" variant="secondary" icon={<KeyRound className="size-4" />}>Change password</Button>
            </form>
          </Card>
        </div>
        <Card className="p-6 sm:p-8">
          <form onSubmit={save} className="space-y-8">
            <StudentFields value={form} onChange={setForm} lockEmail />
            <p className="text-xs text-muted">Status, IDs and membership details are managed by the association and cannot be edited here.</p>
            <FormError message={err} />
            <Button type="submit" size="lg" loading={busy} icon={<Save className="size-4" />}>Save profile</Button>
          </form>
        </Card>
      </div>
    </>
  );
}

export default function ProfilePage() {
  return <Suspense fallback={<LoadingState />}><ProfileInner /></Suspense>;
}
