'use client';
import { useEffect, useState } from 'react';
import { CircleCheck, CircleX, Rocket, Circle } from 'lucide-react';
import { Container, Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Checkbox, Field, FormError, Input } from '@/components/ui/Form';
import { LoadingState } from '@/components/ui/States';
import { cn } from '@/lib/format';

type Step = { step: string; ok: boolean; detail: string };
const PLANNED = ['Connect Google account', 'Select Google Drive root folder', 'Create Google Spreadsheet', 'Create all required sheets', 'Create headers',
  'Create default settings', 'Create Google Drive folders', 'Save IDs', 'Create first admin', 'Configure association details', 'Install automation triggers', 'Publish website'];

/** First-run wizard (spec §102). Runs setupSystem in Apps Script, protected by the SETUP_TOKEN script property. */
export function SetupWizard() {
  const [status, setStatus] = useState<{ initialized: boolean; hasSpreadsheet: boolean } | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [form, setForm] = useState({ setupToken: '', driveRootFolderId: '', associationName: '', email: '', phone: '', timezone: 'Asia/Kolkata',
    adminEmail: '', adminPassword: '', adminName: '', siteUrl: '', sampleData: true, rerun: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ready: boolean; status: string; steps: Step[]; spreadsheetUrl?: string } | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((f) => ({ ...f, siteUrl: window.location.origin }));
    fetch('/api/setup').then((r) => r.json()).then((r) => {
      if (r.success) setStatus(r.data);
      else setStatusError(r.error === 'NOT_CONFIGURED' ? 'APPS_SCRIPT_URL is not configured on the website server.' : r.message);
    }).catch(() => setStatusError('Could not reach the backend.'));
  }, []);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function run(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }).then((x) => x.json());
      if (!r.success) setError(r.message || 'Setup failed.');
      else setResult(r.data);
    } catch {
      setError('Setup request failed. It may still be running — check again in a minute.');
    } finally {
      setBusy(false);
    }
  }

  const steps: Step[] = result?.steps || PLANNED.map((s) => ({ step: s, ok: false, detail: '' }));
  return (
    <div className="bg-surface py-12 sm:py-16">
      <Container className="grid max-w-6xl gap-8 lg:grid-cols-[1.2fr_1fr]">
        <Card className="p-6 sm:p-8">
          <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-accent-600">Initial setup</p>
          <h1 className="mt-1 font-display text-4xl font-extrabold uppercase">Setup wizard</h1>
          {!status && !statusError ? <LoadingState /> : statusError ? <FormError message={statusError} /> : status!.initialized && !form.rerun && !result ? (
            <div className="mt-6 space-y-4">
              <p className="rounded-2xl bg-emerald-50 p-4 font-semibold text-emerald-800">The system is already set up and running.</p>
              <div className="flex flex-wrap gap-3"><ButtonLink href="/admin/login">Admin login</ButtonLink><ButtonLink href="/" variant="secondary">View website</ButtonLink></div>
              <Checkbox checked={form.rerun} onChange={set('rerun')} label="Re-run setup (safe: repairs missing sheets, headers and folders)" />
            </div>
          ) : (
            <form onSubmit={run} className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Setup token" htmlFor="st" required hint="Value of the SETUP_TOKEN Script Property" className="sm:col-span-2"><Input id="st" type="password" value={form.setupToken} onChange={set('setupToken')} required /></Field>
              <Field label="Google Drive root folder (URL or ID)" htmlFor="root" required className="sm:col-span-2" hint="All folders are created inside this folder automatically.">
                <Input id="root" value={form.driveRootFolderId} onChange={set('driveRootFolderId')} required placeholder="https://drive.google.com/drive/folders/…" />
              </Field>
              <Field label="Association name" htmlFor="an" required><Input id="an" value={form.associationName} onChange={set('associationName')} required /></Field>
              <Field label="Timezone" htmlFor="tz"><Input id="tz" value={form.timezone} onChange={set('timezone')} /></Field>
              <Field label="Public email" htmlFor="em"><Input id="em" type="email" value={form.email} onChange={set('email')} /></Field>
              <Field label="Public phone" htmlFor="ph"><Input id="ph" value={form.phone} onChange={set('phone')} /></Field>
              <Field label="First admin email" htmlFor="ae" required><Input id="ae" type="email" value={form.adminEmail} onChange={set('adminEmail')} required /></Field>
              <Field label="First admin password" htmlFor="ap" hint="Leave empty to use Google sign-in only."><Input id="ap" type="password" value={form.adminPassword} onChange={set('adminPassword')} minLength={8} autoComplete="new-password" /></Field>
              <Field label="Website URL" htmlFor="su" className="sm:col-span-2" hint="Used for QR codes and verification links."><Input id="su" value={form.siteUrl} onChange={set('siteUrl')} /></Field>
              <Checkbox className="sm:col-span-2" checked={form.sampleData} onChange={set('sampleData')} label="Create demo data (sample events, programs and plans — removable from Admin → Settings)" />
              <div className="space-y-3 sm:col-span-2">
                <FormError message={error} />
                <Button type="submit" size="lg" variant="accent" loading={busy} icon={<Rocket className="size-5" />}>{busy ? 'Setting up… (up to a few minutes)' : 'Run setup'}</Button>
              </div>
            </form>
          )}
        </Card>
        <Card className="p-6 sm:p-8">
          <h2 className="font-display text-xl font-bold uppercase">Progress</h2>
          <ol className="mt-5 space-y-3">
            {steps.map((s, i) => (
              <li key={s.step} className="flex gap-3">
                {result ? (s.ok ? <CircleCheck className="size-5 shrink-0 text-emerald-600" aria-label="Done" /> : <CircleX className="size-5 shrink-0 text-red-600" aria-label="Failed" />)
                  : <Circle className={cn('size-5 shrink-0', busy ? 'animate-pulse text-brand-400' : 'text-line')} aria-hidden />}
                <div className="min-w-0"><p className="text-sm font-semibold">Step {i + 1} · {s.step}</p>{s.detail && <p className="truncate text-xs text-muted">{s.detail}</p>}</div>
              </li>
            ))}
          </ol>
          {result && (
            <div className={cn('mt-6 rounded-2xl p-5 text-center', result.ready ? 'bg-emerald-600 text-white' : 'bg-red-50 text-red-800')}>
              <p className="font-display text-3xl font-extrabold uppercase">{result.status}</p>
              {result.ready && <div className="mt-4 flex flex-wrap justify-center gap-2"><ButtonLink href="/admin/login" variant="light">Admin login</ButtonLink>
                {result.spreadsheetUrl && <a href={result.spreadsheetUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center rounded-full px-5 text-sm font-semibold ring-1 ring-white/50">Open spreadsheet</a>}</div>}
            </div>
          )}
        </Card>
      </Container>
    </div>
  );
}
