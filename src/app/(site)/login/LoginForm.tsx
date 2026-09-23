'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { AuthShell } from '@/components/portal/AuthShell';
import { GoogleSignIn } from '@/components/portal/GoogleSignIn';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, FormError, Input } from '@/components/ui/Form';

export function LoginForm({ next, googleClientId }: { next: string; googleClientId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const done = (needsProfile: boolean) => {
    router.replace(needsProfile ? `/dashboard/complete-profile?next=${encodeURIComponent(next)}` : next);
    router.refresh();
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.login(email, password);
      done(user.needsProfile);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  async function google(credential: string) {
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.googleLogin(credential, 'student');
      done(user.needsProfile);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Google sign-in failed.');
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle={<>New here? <Link href={`/register?next=${encodeURIComponent(next)}`} className="font-bold text-brand-700 hover:underline">Create an athlete account</Link></>}>
      <Card className="p-6 sm:p-8">
        {googleClientId && (
          <>
            <GoogleSignIn clientId={googleClientId} onCredential={google} />
            <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          </>
        )}
        <form onSubmit={submit} className="space-y-4" noValidate={false}>
          <Field label="Email" htmlFor="email" required><Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          <Field label="Password" htmlFor="password" required><Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
          <FormError message={error} />
          <Button type="submit" size="lg" className="w-full" loading={busy} icon={<LogIn className="size-4" />}>Login</Button>
        </form>
        <p className="mt-6 text-center text-xs text-muted">Forgot your password? Contact the association office to reset it. <Link href="/admin/login" className="font-semibold text-ink-soft hover:underline">Admin login</Link></p>
      </Card>
    </AuthShell>
  );
}
