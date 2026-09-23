'use client';
import { useEffect, useState } from 'react';
import { Upload, Search, X } from 'lucide-react';
import { api } from '@/lib/api';
import { IMAGE_TYPES, toFilePayload } from '@/lib/files';
import { Input, Select } from '@/components/ui/Form';
import type { Row } from '@/lib/types';

let eventsPromise: Promise<Row[]> | null = null;
export function loadEvents(force = false): Promise<Row[]> {
  if (!eventsPromise || force) eventsPromise = api.admin.call<{ items: Row[] }>('getEvents', { all: true }).then((r) => r.items).catch(() => { eventsPromise = null; return []; });
  return eventsPromise;
}

export function useEvents() {
  const [events, setEvents] = useState<Row[]>([]);
  useEffect(() => { void loadEvents().then(setEvents); }, []);
  return events;
}

export function EventSelect({ value, onChange, id, allowEmpty = true, required }: { value: string; onChange: (v: string) => void; id?: string; allowEmpty?: boolean; required?: boolean }) {
  const events = useEvents();
  return (
    <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} required={required}>
      {allowEmpty && <option value="">{required ? 'Select event' : 'None'}</option>}
      {events.map((e) => <option key={String(e.Event_ID)} value={String(e.Event_ID)}>{String(e.Event_Name)} ({String(e.Start_Date)})</option>)}
    </Select>
  );
}

/** URL field with an upload button (image is stored in Google Drive and made public). */
export function ImageInput({ value, onChange, id, target = 'image' }: { value: string; onChange: (v: string) => void; id?: string; target?: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(true);
    setErr('');
    try {
      const r = await api.admin.upload(target, await toFilePayload(f, { allowed: IMAGE_TYPES }));
      onChange(r.url);
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="flex gap-2">
        {value && <img src={value} alt="" className="size-11 shrink-0 rounded-lg object-cover ring-1 ring-line" />}
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="https://… or upload" />
        <label className="inline-flex h-11 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-semibold ring-1 ring-line hover:ring-brand-300">
          <Upload className="size-4" />{busy ? '…' : 'Upload'}
          <input type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" onChange={upload} disabled={busy} />
        </label>
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}

type StudentHit = { id: string; name: string; academy: string; city: string; gender: string; dob: string };

/** Search-as-you-type student picker. */
export function StudentPicker({ value, onChange, id }: { value: string; onChange: (v: string, s?: StudentHit) => void; id?: string }) {
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<StudentHit[]>([]);
  useEffect(() => {
    if (q.length < 2) return;
    const t = setTimeout(() => { void api.admin.call<StudentHit[]>('searchStudents', { q }).then(setHits).catch(() => setHits([])); }, 250);
    return () => clearTimeout(t);
  }, [q]);
  if (value) {
    return (
      <div className="flex h-11 items-center justify-between rounded-xl bg-brand-50 px-3 text-sm ring-1 ring-brand-200">
        <span className="font-mono font-semibold">{value}</span>
        <button type="button" onClick={() => onChange('')} aria-label="Clear student"><X className="size-4" /></button>
      </div>
    );
  }
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted" aria-hidden />
      <Input id={id} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, ID, email or mobile" className="pl-9" autoComplete="off" />
      {q.length >= 2 && hits.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl bg-white shadow-[var(--shadow-lift)] ring-1 ring-line">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-surface" onClick={() => { onChange(h.id, h); setQ(''); setHits([]); }}>
                <span className="font-semibold">{h.name}</span> <span className="font-mono text-xs text-muted">{h.id}</span>
                <span className="block text-xs text-muted">{[h.academy, h.city, h.dob].filter(Boolean).join(' · ')}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
