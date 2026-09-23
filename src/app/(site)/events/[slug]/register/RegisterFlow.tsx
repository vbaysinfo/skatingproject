'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Check, CalendarDays, MapPin, UserRound, ListChecks, ClipboardCheck, CreditCard, PartyPopper } from 'lucide-react';
import type { EventDetail } from '@/lib/types';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { cn, formatDate, formatDateRange, formatMoney, labelize } from '@/lib/format';
import { Container, Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Checkbox, FormError } from '@/components/ui/Form';
import { LoadingState } from '@/components/ui/States';
import { Badge } from '@/components/ui/Badge';

const STEPS = [
  { key: 'profile', label: 'Profile', icon: UserRound },
  { key: 'category', label: 'Category', icon: ListChecks },
  { key: 'confirm', label: 'Confirm', icon: ClipboardCheck },
  { key: 'payment', label: 'Payment', icon: CreditCard },
] as const;

/** Event registration: profile → category → confirm → payment → confirmation. */
export function RegisterFlow({ event, currency }: { event: EventDetail; currency: string }) {
  const router = useRouter();
  const { data: profile, loading } = useApi(() => api.getStudentProfile(), []);
  const [step, setStep] = useState(0);
  const [categoryId, setCategoryId] = useState('');
  const [accept, setAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasCategories = event.categories.length > 0;
  const category = event.categories.find((c) => c.id === categoryId);
  const fee = category ? category.entryFee : event.entryFee;

  const eligibility = useMemo(() => {
    const map: Record<string, string | null> = {};
    if (!profile) return map;
    event.categories.forEach((c) => {
      const g = c.gender.toUpperCase();
      if ((g === 'MALE' || g === 'FEMALE') && profile.gender && profile.gender !== g) map[c.id] = `For ${labelize(g).toLowerCase()} athletes`;
      else if (c.registrationState !== 'OPEN') map[c.id] = c.registrationState === 'FULL' ? 'Category full' : 'Closed';
      else map[c.id] = null;
    });
    return map;
  }, [profile, event.categories]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      const r = await api.registerEvent(event.id, categoryId, accept);
      if (r.nextStep === 'PAYMENT') {
        router.push(`/pay/${r.payment.id}?next=${encodeURIComponent(`/dashboard/registrations/${r.registration.id}?new=1`)}`);
      } else {
        router.push(`/dashboard/registrations/${r.registration.id}?new=1`);
      }
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
      setBusy(false);
    }
  }

  if (event.registrationState !== 'OPEN') {
    return (
      <Container className="py-20 text-center">
        <p className="font-display text-4xl font-extrabold uppercase">Registration {event.registrationState === 'FULL' ? 'full' : 'closed'}</p>
        <p className="mt-2 text-muted">{event.name} is not accepting registrations right now.</p>
        <ButtonLink href={`/events/${event.slug}`} className="mt-6">Back to event</ButtonLink>
      </Container>
    );
  }

  return (
    <div className="bg-surface py-10 sm:py-14">
      <Container className="max-w-4xl">
        <Link href={`/events/${event.slug}`} className="text-sm font-semibold text-brand-700 hover:underline">← {event.name}</Link>
        <h1 className="mt-3 font-display text-4xl font-extrabold uppercase leading-none sm:text-5xl">Event registration</h1>
        <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
          <span className="flex items-center gap-1.5"><CalendarDays className="size-4" aria-hidden />{formatDateRange(event.startDate, event.endDate)}</span>
          <span className="flex items-center gap-1.5"><MapPin className="size-4" aria-hidden />{[event.venue, event.city].filter(Boolean).join(', ')}</span>
        </p>

        <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Registration steps">
          {STEPS.map((s, i) => (
            <li key={s.key} aria-current={i === step ? 'step' : undefined}
              className={cn('flex flex-col items-center gap-2 rounded-2xl px-2 py-3 text-center text-[11px] font-bold uppercase tracking-wider sm:flex-row sm:justify-center sm:text-xs',
                i < step ? 'bg-emerald-50 text-emerald-700' : i === step ? 'bg-ink text-white' : 'bg-white text-muted ring-1 ring-line')}>
              {i < step ? <Check className="size-4" aria-hidden /> : <s.icon className="size-4" aria-hidden />}{s.label}
            </li>
          ))}
        </ol>

        <Card className="mt-6 p-6 sm:p-8">
          {loading ? <LoadingState label="Loading your profile…" /> : !profile ? <FormError message="We couldn't load your profile. Please refresh." /> : (
            <>
              {step === 0 && (
                <div>
                  <h2 className="font-display text-2xl font-bold uppercase">Your athlete profile</h2>
                  <p className="mt-1 text-sm text-muted">Please confirm these details are correct — they are used for categories and certificates.</p>
                  <dl className="mt-6 grid gap-4 rounded-2xl bg-surface p-5 sm:grid-cols-3">
                    {[['Name', profile.fullName], ['Student ID', profile.id], ['Date of birth', formatDate(profile.dob)], ['Age', String(profile.age ?? '—')], ['Gender', labelize(profile.gender)],
                      ['Academy', profile.academy || '—'], ['City', profile.city], ['Parent / guardian', profile.parentName], ['Status', profile.status]].map(([k, v]) => (
                      <div key={k}><dt className="text-[11px] font-bold uppercase tracking-wider text-muted">{k}</dt><dd className="font-semibold">{v}</dd></div>
                    ))}
                  </dl>
                  <div className="mt-6 flex flex-wrap justify-between gap-3">
                    <ButtonLink href={`/dashboard/profile?next=${encodeURIComponent(`/events/${event.slug}/register`)}`} variant="secondary">Edit profile</ButtonLink>
                    <Button onClick={() => setStep(hasCategories ? 1 : 2)}>Details are correct</Button>
                  </div>
                </div>
              )}
              {step === 1 && (
                <fieldset>
                  <legend className="font-display text-2xl font-bold uppercase">Select event category</legend>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {event.categories.map((c) => {
                      const reason = eligibility[c.id];
                      return (
                        <label key={c.id} className={cn('flex cursor-pointer gap-3 rounded-2xl p-4 ring-1 transition',
                          categoryId === c.id ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-line hover:ring-brand-300', reason && 'cursor-not-allowed opacity-55')}>
                          <input type="radio" name="category" value={c.id} disabled={!!reason} checked={categoryId === c.id} onChange={() => setCategoryId(c.id)} className="mt-1 size-4 accent-brand-600" />
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-ink">{c.name}</span>
                            <span className="mt-0.5 block text-xs text-muted">{[c.ageGroup, labelize(c.gender), c.raceType].filter(Boolean).join(' · ')}</span>
                            {reason && <span className="mt-1 block text-xs font-semibold text-red-600">{reason}</span>}
                          </span>
                          <span className="font-display text-lg font-bold">{formatMoney(c.entryFee, currency)}</span>
                        </label>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-muted">Age groups are checked against your date of birth on the event start date.</p>
                  <div className="mt-6 flex justify-between gap-3">
                    <Button variant="secondary" onClick={() => setStep(0)}>Back</Button>
                    <Button disabled={!categoryId} onClick={() => setStep(2)}>Continue</Button>
                  </div>
                </fieldset>
              )}
              {step === 2 && (
                <div>
                  <h2 className="font-display text-2xl font-bold uppercase">Confirm details</h2>
                  <dl className="mt-5 divide-y divide-line rounded-2xl ring-1 ring-line">
                    {[['Event', event.name], ['Dates', formatDateRange(event.startDate, event.endDate)], ['Athlete', `${profile.fullName} (${profile.id})`],
                      ['Category', category ? category.name : 'General entry']].map(([k, v]) => (
                      <div key={k} className="flex flex-wrap justify-between gap-2 px-5 py-3.5"><dt className="text-sm text-muted">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
                    ))}
                    <div className="flex justify-between gap-2 bg-surface px-5 py-4"><dt className="font-bold uppercase tracking-wider">Entry fee</dt><dd className="font-display text-2xl font-bold">{formatMoney(fee, currency)}</dd></div>
                  </dl>
                  <div className="mt-5 space-y-3">
                    <Checkbox checked={accept} onChange={(e) => setAccept(e.target.checked)}
                      label={<>I agree to the association <Link href="/terms" target="_blank" className="font-semibold text-brand-700 underline">terms and conditions</Link> and the event rules.{(profile.age ?? 18) < 18 && ' As parent/guardian, I consent to this minor’s participation.'}</>} />
                  </div>
                  <FormError message={error} />
                  <div className="mt-6 flex justify-between gap-3">
                    <Button variant="secondary" onClick={() => setStep(hasCategories ? 1 : 0)} disabled={busy}>Back</Button>
                    <Button variant="accent" size="lg" disabled={!accept} loading={busy} onClick={submit}>{fee > 0 ? 'Continue to payment' : 'Complete registration'}</Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs text-muted"><PartyPopper className="size-4" aria-hidden />You&apos;ll receive a registration number (REG-…) immediately. <Badge tone="slate">Secure</Badge></p>
      </Container>
    </div>
  );
}
