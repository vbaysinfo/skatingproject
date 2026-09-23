'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { LogoMark } from '@/components/site/Logo';
import { GoogleSignIn } from '@/components/portal/GoogleSignIn';
import { Button } from '@/components/ui/Button';
import { Field, FormError, Input } from '@/components/ui/Form';

export function AdminLoginForm({ next, siteName, logoUrl, googleClientId }: { next: string; siteName: string; logoUrl?: string; googleClientId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const done = () => { router.replace(next); router.refresh(); };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try { await api.adminLogin(email, password); done(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'); setBusy(false); }
  }
  async function google(credential: string) {
    setBusy(true);
    try { await api.googleLogin(credential, 'admin'); done(); }
    catch (err) { setError(err instanceof ApiError ? err.message : 'Google sign-in failed.'); setBusy(false); }
  }

  return (
    <main id="main" className="relative grid min-h-dvh place-items-center overflow-hidden bg-ink px-4 py-12">
      <div className="speed-lines absolute inset-0" aria-hidden />
      <div className="absolute -right-32 -top-32 size-[28rem] rounded-full bg-brand-600/40 blur-3xl" aria-hidden />
      <div className="relative w-full max-w-md rounded-[28px] bg-white p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <LogoMark logoUrl={logoUrl} />
          <div><p className="font-display text-lg font-extrabold uppercase leading-tight">{siteName}</p><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-600">Admin portal</p></div>
        </div>
        <h1 className="mt-8 flex items-center gap-2 font-display text-3xl font-extrabold uppercase"><ShieldCheck className="size-7 text-brand-600" />Administrator sign in</h1>
        <p className="mt-1 text-sm text-muted">Restricted area. All actions are logged.</p>
        {googleClientId && <div className="mt-6"><GoogleSignIn clientId={googleClientId} onCredential={google} /></div>}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Email" htmlFor="ae"><Input id="ae" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Field label="Password" htmlFor="ap"><Input id="ap" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
          <FormError message={error} />
          <Button type="submit" size="lg" className="w-full" loading={busy}>Sign in</Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted"><Link href="/" className="hover:underline">← Back to website</Link></p>
      </div>
    </main>
  );
}
