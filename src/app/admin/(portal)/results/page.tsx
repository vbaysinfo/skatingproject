'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { Save, Send, EyeOff, Award, Plus, Trash2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { Row } from '@/lib/types';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Select } from '@/components/ui/Form';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { EventSelect } from '@/components/admin/Inputs';

type Data = { event: { id: string; name: string; lifecycle: string }; categories: { id: string; name: string }[]; results: Row[]; entrants: Row[] };
type Line = { Result_ID?: string; Student_ID: string; Student_Name: string; Category_ID: string; Bib_Number: string; Heat: string; Lane: string; Race_Time: string; Position: string; Points: string; Result_Status: string; Published?: string };
const s = (v: unknown) => String(v ?? '');
const cell = 'h-9 w-full rounded-lg border border-line px-2 text-sm focus:border-brand-400 focus:outline-none';

function ResultsEditor() {
  const toast = useToast();
  const [eventId, setEventId] = useState(useSearchParams().get('event') || '');
  const [categoryId, setCategoryId] = useState('');
  const [data, setData] = useState<Data | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');

  async function load() {
    if (!eventId) { setData(null); return; }
    setLoading(true);
    try {
      const d = await api.admin.call<Data>('getResults', { eventId, categoryId });
      setData(d);
      const byStudent = new Map(d.results.map((r) => [s(r.Student_ID) + '|' + s(r.Category_ID), r]));
      const out: Line[] = d.results.map((r) => ({ Result_ID: s(r.Result_ID), Student_ID: s(r.Student_ID), Student_Name: s(r.Student_Name), Category_ID: s(r.Category_ID), Bib_Number: s(r.Bib_Number),
        Heat: s(r.Heat), Lane: s(r.Lane), Race_Time: s(r.Race_Time), Position: s(r.Position), Points: s(r.Points), Result_Status: s(r.Result_Status) || 'FINISHED', Published: s(r.Published) }));
      d.entrants.forEach((e) => {
        if (!byStudent.has(s(e.Student_ID) + '|' + s(e.Category_ID))) out.push({ Student_ID: s(e.Student_ID), Student_Name: s(e.Student_Name), Category_ID: s(e.Category_ID), Bib_Number: s(e.Bib_Number),
          Heat: s(e.Heat), Lane: s(e.Lane), Race_Time: '', Position: '', Points: '', Result_Status: 'FINISHED' });
      });
      setLines(out);
    } catch (e) { toast(e instanceof ApiError ? e.message : 'Could not load', 'error'); } finally { setLoading(false); }
  }
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/exhaustive-deps
  useEffect(() => { void load(); }, [eventId, categoryId]);

  const upd = (i: number, k: keyof Line, v: string) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, [k]: v } : l)));
  async function save() {
    const rows = lines.filter((l) => l.Result_ID || l.Race_Time || l.Position || l.Result_Status !== 'FINISHED');
    if (!rows.length) return toast('Enter at least one time, position or status', 'info');
    setBusy('save');
    try { const r = await api.admin.call<{ saved: number }>('saveResults', { eventId, rows: rows.map(({ Student_Name: _n, Published: _p, ...x }) => { void _n; void _p; return x; }) }); toast(`${r.saved} results saved (points calculated from ranking rules)`); await load(); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Save failed', 'error'); } finally { setBusy(''); }
  }
  async function publish(unpublish = false) {
    if (!confirm(unpublish ? 'Unpublish these results?' : 'Publish results? Students will be notified and medal achievements created.')) return;
    setBusy('publish');
    try { const r = await api.admin.call<{ updated: number; achievementsCreated: number }>('publishResults', { eventId, categoryId, unpublish }); toast(unpublish ? 'Results unpublished' : `${r.updated} results published · ${r.achievementsCreated} achievements added`); await load(); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); } finally { setBusy(''); }
  }
  async function certificates() {
    const mode = prompt('Generate certificates for: PODIUM (1st–3rd), FINISHERS, or ALL participants?', 'PODIUM');
    if (!mode) return;
    setBusy('cert');
    try {
      let total = 0, remaining = 1;
      while (remaining > 0) { const r = await api.admin.call<{ created: number; remaining: number }>('generateEventCertificates', { eventId, mode: mode.toUpperCase() }); total += r.created; remaining = r.created ? r.remaining : 0; }
      toast(`${total} certificates generated (PDFs saved to Drive)`);
    } catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); } finally { setBusy(''); }
  }
  async function del(i: number) {
    const l = lines[i]!;
    if (l.Result_ID) {
      if (!confirm('Delete this result?')) return;
      try { await api.admin.call('deleteResult', { id: l.Result_ID }); } catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); return; }
    }
    setLines((ls) => ls.filter((_, j) => j !== i));
  }

  const catName = (id: string) => data?.categories.find((c) => c.id === id)?.name || 'General';
  return (
    <>
      <PortalHeader title="Results" subtitle="Enter times and positions, save, then publish. Only published results are visible to students and the public." />
      <div className="mb-6 grid gap-3 md:grid-cols-2">
        <Field label="Event" htmlFor="re"><EventSelect id="re" value={eventId} onChange={(v) => { setEventId(v); setCategoryId(''); }} /></Field>
        <Field label="Category" htmlFor="rc"><Select id="rc" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={!data}>
          <option value="">All categories</option>{data?.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select></Field>
      </div>
      {!eventId ? <EmptyState title="Select an event" message="Registered athletes are pre-filled so you only type times and positions." /> : loading ? <LoadingState /> : data && (
        <Card>
          <CardHeader title={data.event.name} subtitle={`${lines.length} athletes · event is ${data.event.lifecycle.toLowerCase()}`}
            action={<div className="flex flex-wrap gap-2">
              <Button onClick={save} loading={busy === 'save'} icon={<Save className="size-4" />}>Save</Button>
              <Button variant="accent" onClick={() => publish(false)} loading={busy === 'publish'} icon={<Send className="size-4" />}>Publish</Button>
              <Button variant="secondary" onClick={() => publish(true)} icon={<EyeOff className="size-4" />}>Unpublish</Button>
              <Button variant="secondary" onClick={certificates} loading={busy === 'cert'} icon={<Award className="size-4" />}>Certificates</Button>
            </div>} />
          {lines.length === 0 ? <div className="p-5"><EmptyState title="No entrants" message="No confirmed registrations for this selection." /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead><tr className="border-b border-line bg-surface/70 text-[11px] font-bold uppercase tracking-wider text-muted">
                  <th className="px-4 py-3">Athlete</th><th className="px-2 py-3">Category</th><th className="w-20 px-2 py-3">Bib</th><th className="w-20 px-2 py-3">Heat</th><th className="w-16 px-2 py-3">Lane</th>
                  <th className="w-28 px-2 py-3">Time</th><th className="w-20 px-2 py-3">Pos</th><th className="w-20 px-2 py-3">Points</th><th className="w-28 px-2 py-3">Status</th><th className="px-2 py-3">Pub.</th><th />
                </tr></thead>
                <tbody>
                  {lines.map((l, i) => (
                    <tr key={l.Student_ID + l.Category_ID + i} className="border-b border-line/70">
                      <td className="px-4 py-2"><p className="font-semibold">{l.Student_Name}</p><p className="font-mono text-[11px] text-muted">{l.Student_ID}</p></td>
                      <td className="px-2 py-2 text-xs">{catName(l.Category_ID)}</td>
                      {(['Bib_Number', 'Heat', 'Lane', 'Race_Time', 'Position', 'Points'] as const).map((k) => (
                        <td key={k} className="px-2 py-2"><input aria-label={`${k.replace('_', ' ')} for ${l.Student_Name}`} className={cell} value={l[k]} onChange={(e) => upd(i, k, e.target.value)}
                          placeholder={k === 'Race_Time' ? '0:52.41' : k === 'Points' ? 'auto' : ''} inputMode={k === 'Position' || k === 'Lane' ? 'numeric' : undefined} /></td>
                      ))}
                      <td className="px-2 py-2"><select aria-label={`Status for ${l.Student_Name}`} className={cell} value={l.Result_Status} onChange={(e) => upd(i, 'Result_Status', e.target.value)}>{['FINISHED', 'DNS', 'DNF', 'DSQ'].map((x) => <option key={x}>{x}</option>)}</select></td>
                      <td className="px-2 py-2">{l.Published ? <StatusBadge status={/true/i.test(l.Published) ? 'PUBLISHED' : 'DRAFT'} /> : '—'}</td>
                      <td className="px-2 py-2"><button type="button" onClick={() => del(i)} className="grid size-8 place-items-center rounded-full text-red-600 hover:bg-red-50" aria-label="Remove"><Trash2 className="size-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="flex items-center gap-2 border-t border-line px-5 py-3 text-xs text-muted"><Plus className="size-3.5" />Athletes appear here from confirmed registrations. Leave Points empty to apply the ranking rules.</p>
        </Card>
      )}
    </>
  );
}

export default function Page() { return <Suspense><ResultsEditor /></Suspense>; }
