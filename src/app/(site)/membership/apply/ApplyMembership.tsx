'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Check, FileUp, Trash2 } from 'lucide-react';
import type { Plan } from '@/lib/types';
import { api, ApiError, type FilePayload } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { DOCUMENT_TYPES, toFilePayload } from '@/lib/files';
import { formatDate, formatMoney, labelize } from '@/lib/format';
import { Container, Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Checkbox, Field, FormError, Select } from '@/components/ui/Form';
import { LoadingState } from '@/components/ui/States';

const DOC_TYPES = ['BIRTH_CERTIFICATE', 'STUDENT_ID', 'PHOTO', 'MEDICAL_CONSENT', 'ADDRESS_PROOF', 'OTHER'];

export function ApplyMembership({ plan }: { plan: Plan }) {
  const router = useRouter();
  const { data: profile, loading } = useApi(() => api.getStudentProfile(), []);
  const [docs, setDocs] = useState<{ type: string; file: FilePayload }[]>([]);
  const [docType, setDocType] = useState('BIRTH_CERTIFICATE');
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addDoc(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    try {
      const file = await toFilePayload(f, { allowed: DOCUMENT_TYPES });
      setDocs((d) => [...d, { type: docType, file }].slice(0, 5));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.applyMembership(plan.id, accept, docs);
      router.push(r.nextStep === 'PAYMENT' ? `/pay/${r.payment.id}?next=/dashboard/membership` : '/dashboard/membership');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  return (
    <div className="bg-surface py-10 sm:py-14">
      <Container className="grid max-w-5xl gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div>
            <Link href="/membership" className="text-sm font-semibold text-brand-700 hover:underline">← Membership plans</Link>
            <h1 className="mt-3 font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">Apply for membership</h1>
          </div>
          <Card className="p-6">
            <h2 className="font-display text-xl font-bold uppercase">1 · Profile</h2>
            {loading ? <LoadingState /> : profile && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-surface p-4">
                <div>
                  <p className="font-semibold">{profile.fullName} <span className="font-mono text-xs text-muted">{profile.id}</span></p>
                  <p className="text-sm text-muted">{formatDate(profile.dob)} · {labelize(profile.gender)} · {profile.city}</p>
                </div>
                <ButtonLink href="/dashboard/profile?next=/membership/apply" variant="secondary" size="sm">Edit</ButtonLink>
              </div>
            )}
          </Card>
          <Card className="p-6">
            <h2 className="font-display text-xl font-bold uppercase">2 · Documents</h2>
            <p className="mt-1 text-sm text-muted">Upload proof of age / identity if required for this plan. Files are stored privately in the association’s Google Drive.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Select aria-label="Document type" value={docType} onChange={(e) => setDocType(e.target.value)} className="w-52">
                {DOC_TYPES.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}
              </Select>
              <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-ink-soft">
                <FileUp className="size-4" aria-hidden />Add file
                <input type="file" accept={DOCUMENT_TYPES.join(',')} className="sr-only" onChange={addDoc} />
              </label>
            </div>
            {docs.length > 0 && (
              <ul className="mt-4 divide-y divide-line rounded-2xl ring-1 ring-line">
                {docs.map((d, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span className="min-w-0"><span className="font-semibold">{labelize(d.type)}</span> <span className="truncate text-muted">{d.file.name}</span></span>
                    <button type="button" onClick={() => setDocs((x) => x.filter((_, j) => j !== i))} className="text-red-600" aria-label={'Remove ' + d.file.name}><Trash2 className="size-4" /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-6">
            <h2 className="font-display text-xl font-bold uppercase">3 · Confirm</h2>
            <Checkbox className="mt-4" checked={accept} onChange={(e) => setAccept(e.target.checked)}
              label={<>I confirm the information is correct and agree to the <Link href="/terms" target="_blank" className="font-semibold text-brand-700 underline">terms and conditions</Link>.</>} />
            <FormError message={error} />
            <Button variant="accent" size="lg" className="mt-5 w-full sm:w-auto" disabled={!accept || loading} loading={busy} onClick={submit}>
              {plan.fee > 0 ? 'Continue to payment' : 'Submit application'}
            </Button>
          </Card>
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <Card className="overflow-hidden">
            <div className="bg-ink p-6 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-400">{plan.type}</p>
              <p className="mt-1 font-display text-3xl font-extrabold uppercase leading-none">{plan.name}</p>
              <p className="mt-4 font-display text-4xl font-extrabold">{formatMoney(plan.fee)}<span className="ml-1 text-sm font-semibold text-white/60">/ {plan.durationMonths} months</span></p>
            </div>
            <ul className="space-y-2.5 p-6 text-sm">
              {plan.benefits.map((b) => <li key={b} className="flex gap-2.5"><Check className="size-4 shrink-0 text-emerald-600" aria-hidden />{b}</li>)}
            </ul>
          </Card>
        </aside>
      </Container>
    </div>
  );
}
