'use client';
import { useState } from 'react';
import { Send } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Field, FormError, FormSuccess, Input, Textarea } from '@/components/ui/Form';

export function ContactForm({ initialSubject }: { initialSubject: string }) {
  const [form, setForm] = useState({ name: '', mobile: '', email: '', subject: initialSubject, message: '', website: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await api.submitContact(form);
      setDone(`Thank you! Your message has been received${r.reference ? ` (reference ${r.reference})` : ''}.`);
      setForm({ name: '', mobile: '', email: '', subject: '', message: '', website: '' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
      <Field label="Name" htmlFor="c-name" required><Input id="c-name" value={form.name} onChange={set('name')} required maxLength={120} autoComplete="name" /></Field>
      <Field label="Mobile" htmlFor="c-mobile"><Input id="c-mobile" type="tel" value={form.mobile} onChange={set('mobile')} autoComplete="tel" pattern="\+?[0-9][0-9\s\-]{8,16}" /></Field>
      <Field label="Email" htmlFor="c-email" required className="sm:col-span-2"><Input id="c-email" type="email" value={form.email} onChange={set('email')} required autoComplete="email" /></Field>
      <Field label="Subject" htmlFor="c-subject" required className="sm:col-span-2"><Input id="c-subject" value={form.subject} onChange={set('subject')} required maxLength={200} /></Field>
      <Field label="Message" htmlFor="c-message" required className="sm:col-span-2"><Textarea id="c-message" value={form.message} onChange={set('message')} required rows={6} maxLength={5000} /></Field>
      {/* Honeypot for bots — hidden from people and assistive tech */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} /></label>
      </div>
      <div className="space-y-3 sm:col-span-2">
        <FormError message={error} />
        <FormSuccess message={done} />
        <Button type="submit" size="lg" loading={busy} icon={<Send className="size-4" />}>Send message</Button>
      </div>
    </form>
  );
}
