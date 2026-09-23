'use client';
import { useState } from 'react';
import type { Row } from '@/lib/types';
import { Checkbox, Field, FormError, Input, Select, Textarea } from '@/components/ui/Form';
import { Button } from '@/components/ui/Button';

export const EVENT_TYPES = ['NATIONAL', 'STATE', 'DISTRICT', 'OPEN', 'SCHOOL', 'ACADEMY', 'CHAMPIONSHIP', 'TRAINING', 'OTHER'];
const FIELDS = ['Event_Name', 'Event_Code', 'Event_Type', 'Start_Date', 'End_Date', 'Registration_Start', 'Registration_Deadline', 'Venue', 'City', 'State',
  'Description', 'Rules_Text', 'Schedule', 'Entry_Fee', 'Maximum_Participants', 'Organizer', 'Contact', 'Map_URL', 'Featured', 'Status',
  'Registration_Override', 'Capacity_Override', 'Allow_Duplicate_Registration', 'Sponsor_IDs', 'Slug', 'Poster_URL', 'Rules_URL'];

const s = (v: unknown) => String(v ?? '');
const truthy = (v: unknown) => v === true || /^(true|yes|1)$/i.test(s(v));

/** Event create/edit form (spec §40). */
export function EventForm({ initial, onSubmit, submitLabel }: { initial?: Row; onSubmit: (data: Record<string, unknown>) => Promise<void>; submitLabel: string }) {
  const [f, setF] = useState<Record<string, unknown>>(() => {
    const o: Record<string, unknown> = { Event_Type: 'STATE', Status: 'DRAFT', Registration_Override: 'AUTO' };
    FIELDS.forEach((k) => { if (initial && initial[k] !== undefined) o[k] = initial[k]; });
    return o;
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const bool = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.checked ? 'TRUE' : 'FALSE' });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try { await onSubmit(f); } catch (err) { setError((err as Error).message); } finally { setBusy(false); }
  }
  const dt = (v: unknown) => s(v).replace(' ', 'T').slice(0, 16);

  return (
    <form onSubmit={submit} className="space-y-8">
      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-3 font-display text-lg font-bold uppercase">Basics</legend>
        <Field label="Event name" htmlFor="en" required className="md:col-span-2"><Input id="en" value={s(f.Event_Name)} onChange={set('Event_Name')} required maxLength={200} /></Field>
        <Field label="Event code" htmlFor="ec" hint="Auto-generated if empty"><Input id="ec" value={s(f.Event_Code)} onChange={set('Event_Code')} /></Field>
        <Field label="Event type" htmlFor="et"><Select id="et" value={s(f.Event_Type)} onChange={set('Event_Type')}>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Status" htmlFor="es" hint="Only PUBLISHED events appear on the website"><Select id="es" value={s(f.Status)} onChange={set('Status')}>{['DRAFT', 'PUBLISHED', 'CANCELLED', 'ARCHIVED'].map((t) => <option key={t}>{t}</option>)}</Select></Field>
        <Field label="Organizer" htmlFor="eo"><Input id="eo" value={s(f.Organizer)} onChange={set('Organizer')} /></Field>
        <Field label="Description" htmlFor="ed" className="md:col-span-3"><Textarea id="ed" value={s(f.Description)} onChange={set('Description')} rows={5} /></Field>
      </fieldset>
      <fieldset className="grid gap-4 md:grid-cols-4">
        <legend className="mb-3 font-display text-lg font-bold uppercase">Dates</legend>
        <Field label="Start date" htmlFor="sd" required><Input id="sd" type="date" value={s(f.Start_Date).slice(0, 10)} onChange={set('Start_Date')} required /></Field>
        <Field label="End date" htmlFor="ed2" required><Input id="ed2" type="date" value={s(f.End_Date).slice(0, 10)} onChange={set('End_Date')} required min={s(f.Start_Date).slice(0, 10)} /></Field>
        <Field label="Registration opens" htmlFor="rs"><Input id="rs" type="datetime-local" value={dt(f.Registration_Start)} onChange={(e) => setF({ ...f, Registration_Start: e.target.value.replace('T', ' ') })} /></Field>
        <Field label="Registration deadline" htmlFor="rd" hint="Default: end of the start date"><Input id="rd" type="datetime-local" value={dt(f.Registration_Deadline)} onChange={(e) => setF({ ...f, Registration_Deadline: e.target.value.replace('T', ' ') })} /></Field>
      </fieldset>
      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-3 font-display text-lg font-bold uppercase">Venue</legend>
        <Field label="Venue" htmlFor="v"><Input id="v" value={s(f.Venue)} onChange={set('Venue')} /></Field>
        <Field label="City" htmlFor="c"><Input id="c" value={s(f.City)} onChange={set('City')} /></Field>
        <Field label="State" htmlFor="st"><Input id="st" value={s(f.State)} onChange={set('State')} /></Field>
        <Field label="Contact (shown publicly)" htmlFor="ct"><Input id="ct" value={s(f.Contact)} onChange={set('Contact')} /></Field>
        <Field label="Google Maps embed URL" htmlFor="mu" className="md:col-span-2"><Input id="mu" value={s(f.Map_URL)} onChange={set('Map_URL')} placeholder="https://www.google.com/maps/embed?..." /></Field>
      </fieldset>
      <fieldset className="grid gap-4 md:grid-cols-3">
        <legend className="mb-3 font-display text-lg font-bold uppercase">Registration</legend>
        <Field label="Entry fee" htmlFor="fee" hint="Categories can override the fee"><Input id="fee" type="number" min={0} value={s(f.Entry_Fee)} onChange={set('Entry_Fee')} /></Field>
        <Field label="Maximum participants" htmlFor="max" hint="0 or empty = unlimited"><Input id="max" type="number" min={0} value={s(f.Maximum_Participants)} onChange={set('Maximum_Participants')} /></Field>
        <Field label="Registration override" htmlFor="ro" hint="AUTO follows the dates"><Select id="ro" value={s(f.Registration_Override) || 'AUTO'} onChange={set('Registration_Override')}><option value="AUTO">Auto (dates & capacity)</option><option value="OPEN">Force open</option><option value="CLOSED">Force closed</option></Select></Field>
        <div className="space-y-3 md:col-span-3">
          <Checkbox checked={truthy(f.Capacity_Override)} onChange={bool('Capacity_Override')} label="Capacity override — allow registrations beyond the maximum" />
          <Checkbox checked={truthy(f.Allow_Duplicate_Registration)} onChange={bool('Allow_Duplicate_Registration')} label="Allow the same student to register more than once for a category" />
          <Checkbox checked={truthy(f.Featured)} onChange={bool('Featured')} label="Featured event" />
        </div>
      </fieldset>
      <fieldset className="grid gap-4 md:grid-cols-2">
        <legend className="mb-3 font-display text-lg font-bold uppercase">Rules, schedule & sponsors</legend>
        <Field label="Rules (one per line)" htmlFor="rt"><Textarea id="rt" value={s(f.Rules_Text)} onChange={set('Rules_Text')} rows={5} /></Field>
        <Field label="Schedule" htmlFor="sc" hint="One per line: 2026-10-24 | 08:00 | Opening ceremony"><Textarea id="sc" value={s(f.Schedule)} onChange={set('Schedule')} rows={5} /></Field>
        <Field label="Rules PDF URL" htmlFor="ru" hint="Or upload it in the Media tab"><Input id="ru" value={s(f.Rules_URL)} onChange={set('Rules_URL')} /></Field>
        <Field label="Sponsor IDs (comma separated)" htmlFor="sp"><Input id="sp" value={s(f.Sponsor_IDs)} onChange={set('Sponsor_IDs')} /></Field>
        <Field label="URL slug" htmlFor="sl" hint="Leave empty to generate from the name"><Input id="sl" value={s(f.Slug)} onChange={set('Slug')} /></Field>
      </fieldset>
      <FormError message={error} />
      <Button type="submit" size="lg" loading={busy}>{submitLabel}</Button>
    </form>
  );
}
