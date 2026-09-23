'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { UserPlus, Camera } from 'lucide-react';
import { api, ApiError, type FilePayload } from '@/lib/api';
import { IMAGE_TYPES, DOCUMENT_TYPES, toFilePayload } from '@/lib/files';
import { AuthShell } from '@/components/portal/AuthShell';
import { GoogleSignIn } from '@/components/portal/GoogleSignIn';
import { StudentFields, EMPTY_STUDENT, ageFromDob, type StudentForm } from '@/components/portal/StudentFields';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, FormError, Input, Select } from '@/components/ui/Form';

export function RegisterForm({ next, googleClientId, siteName }: { next: string; googleClientId: string; siteName: string }) {
  const router = useRouter();
  const [form, setForm] = useState<StudentForm>(EMPTY_STUDENT);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [photo, setPhoto] = useState<FilePayload | null>(null);
  const [doc, setDoc] = useState<{ type: string; file: FilePayload } | null>(null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [guardian, setGuardian] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const age = ageFromDob(form.dob);
  const minor = age !== null && age < 18;

  async function pick(e: React.ChangeEvent<HTMLInputElement>, kind: 'photo' | 'doc', docType?: string) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const payload = await toFilePayload(f, { allowed: kind === 'photo' ? IMAGE_TYPES : DOCUMENT_TYPES, maxSide: kind === 'photo' ? 800 : 2000 });
      if (kind === 'photo') setPhoto(payload); else setDoc({ type: docType || 'BIRTH_CERTIFICATE', file: payload });
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      e.target.value = '';
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) return setError('Passwords do not match.');
    if (!acceptTerms) return setError('Please accept the terms and conditions.');
    if (minor && !guardian.trim()) return setError('Parent/guardian consent is required for athletes under 18.');
    setBusy(true);
    try {
      await api.register({ ...form, password, acceptTerms, guardianConsentName: minor ? guardian : '', photo });
      if (doc) await api.uploadDocument(doc.type, doc.file).catch(() => undefined);
      router.replace(next === '/dashboard' ? '/dashboard?welcome=1' : next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  async function google(credential: string) {
    setBusy(true);
    try {
      const { user } = await api.googleLogin(credential, 'student');
      router.replace(user.needsProfile ? `/dashboard/complete-profile?next=${encodeURIComponent(next)}` : next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Google sign-in failed.');
      setBusy(false);
    }
  }

  return (
    <AuthShell wide title="Create athlete account" subtitle={<>Already registered? <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-bold text-brand-700 hover:underline">Login</Link></>}>
      <Card className="p-6 sm:p-8">
        {googleClientId && (
          <div className="mb-8 rounded-2xl bg-surface p-5 text-center">
            <p className="mb-3 text-sm text-muted">Fastest: continue with Google, then complete your athlete profile.</p>
            <GoogleSignIn clientId={googleClientId} onCredential={google} text="signup_with" />
          </div>
        )}
        <form onSubmit={submit} className="space-y-8">
          <StudentFields value={form} onChange={setForm} />
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-display text-lg font-bold uppercase tracking-wide">Photo &amp; documents</legend>
            <Field label="Athlete photo" htmlFor="photo" hint="JPG, PNG or WEBP. Used on your digital membership card.">
              <label htmlFor="photo" className="flex h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line bg-surface px-3 text-sm text-muted hover:border-brand-300">
                <Camera className="size-4" aria-hidden />{photo ? photo.name : 'Choose photo'}
              </label>
              <input id="photo" type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" onChange={(e) => pick(e, 'photo')} />
            </Field>
            <Field label="Birth certificate / ID proof" htmlFor="doc" hint="PDF or image. You can also upload documents later from your dashboard.">
              <div className="flex gap-2">
                <Select aria-label="Document type" className="w-40" defaultValue="BIRTH_CERTIFICATE" id="docType">
                  <option value="BIRTH_CERTIFICATE">Birth certificate</option><option value="STUDENT_ID">Student ID</option><option value="OTHER">Other</option>
                </Select>
                <label htmlFor="doc" className="flex h-11 flex-1 cursor-pointer items-center truncate rounded-xl border border-dashed border-line bg-surface px-3 text-sm text-muted hover:border-brand-300">
                  {doc ? doc.file.name : 'Choose file'}
                </label>
                <input id="doc" type="file" accept={DOCUMENT_TYPES.join(',')} className="sr-only"
                  onChange={(e) => pick(e, 'doc', (document.getElementById('docType') as HTMLSelectElement | null)?.value)} />
              </div>
            </Field>
          </fieldset>
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 font-display text-lg font-bold uppercase tracking-wide">Account</legend>
            <Field label="Password" htmlFor="password" required hint="At least 8 characters with letters and numbers.">
              <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
            </Field>
            <Field label="Confirm password" htmlFor="confirm" required>
              <Input id="confirm" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required minLength={8} />
            </Field>
          </fieldset>
          <div className="space-y-4 rounded-2xl bg-surface p-5">
            <Checkbox checked={acceptTerms} onChange={(e) => setAcceptTerms(e.target.checked)} required
              label={<>I agree to the {siteName} <Link href="/terms" target="_blank" className="font-semibold text-brand-700 underline">terms and conditions</Link> and <Link href="/privacy" target="_blank" className="font-semibold text-brand-700 underline">privacy policy</Link>.</>} />
            {minor && (
              <Field label="Parent / guardian consent — type the parent or guardian's full name" htmlFor="guardian" required hint="The athlete is under 18. Consent is recorded with a timestamp.">
                <Input id="guardian" value={guardian} onChange={(e) => setGuardian(e.target.value)} required maxLength={120} />
              </Field>
            )}
          </div>
          <FormError message={error} />
          <Button type="submit" size="lg" variant="accent" className="w-full sm:w-auto" loading={busy} icon={<UserPlus className="size-4" />}>Create account</Button>
        </form>
      </Card>
    </AuthShell>
  );
}
