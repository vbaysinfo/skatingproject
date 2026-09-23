'use client';
import Link from 'next/link';
import { use, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { ExternalLink, Upload, FolderOpen, Send, EyeOff, Ban, Archive, ClipboardList, Trophy, Wand2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import type { Row } from '@/lib/types';
import { IMAGE_TYPES, DOCUMENT_TYPES, toFilePayload } from '@/lib/files';
import { formatDateRange, formatMoney } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { ButtonTabs } from '@/components/ui/Tabs';
import { Button, ButtonLink } from '@/components/ui/Button';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { StatusBadge, Badge } from '@/components/ui/Badge';
import { Field, Input } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { EntityManager } from '@/components/admin/EntityManager';
import { loadEvents } from '@/components/admin/Inputs';
import { BarList } from '@/components/charts/Charts';
import { EventPoster } from '@/components/events/PosterArt';
import { EventForm } from '../EventForm';

const s = (v: unknown) => String(v ?? '');
type Report = { totals: Record<string, number>; byCategory: Record<string, number>; byGender: Record<string, number>; byAgeGroup: Record<string, number>; byAcademy: Record<string, number> };

function Editor({ id }: { id: string }) {
  const toast = useToast();
  const initialTab = useSearchParams().get('tab') || 'details';
  const [tab, setTab] = useState(initialTab);
  const { data: ev, error, loading, reload, setData } = useApi(() => api.admin.call<Row & { categories: Row[] }>('getEvent', { id }), [id]);
  const [busy, setBusy] = useState('');
  const [gen, setGen] = useState({ ageGroups: 'Under 8, Under 10, Under 12, Under 14, Under 16, Senior', genders: 'MALE, FEMALE', races: '300M Rink, 500M Rink', entryFee: '', maxParticipants: '' });
  const report = useApi(() => (tab === 'report' ? api.admin.call<Report>('getEventReport', { eventId: id }) : Promise.resolve(null)), [tab, id]);

  async function act(action: string, extra: Record<string, unknown> = {}, msg = 'Saved') {
    setBusy(action);
    try { const r = await api.admin.call<Row & { categories: Row[] }>(action, { id, ...extra }); if (r && r.Event_ID) setData(r); else await reload(); toast(msg); void loadEvents(true); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Action failed', 'error'); }
    finally { setBusy(''); }
  }
  async function upload(target: string, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setBusy(target);
    try { await api.admin.upload(target, await toFilePayload(f, { allowed: target === 'eventPoster' ? IMAGE_TYPES : DOCUMENT_TYPES, maxSide: 1800 }), { id }); toast('Uploaded to Google Drive'); await reload(); }
    catch (err) { toast(err instanceof Error ? err.message : 'Upload failed', 'error'); }
    finally { setBusy(''); }
  }

  if (loading && !ev) return <LoadingState />;
  if (error || !ev) return <ErrorState message={error?.message} />;
  const status = s(ev.Status);
  return (
    <>
      <PortalHeader title={s(ev.Event_Name)}
        subtitle={<span className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs">{s(ev.Event_ID)}</span><StatusBadge status={status} /><Badge tone="slate">{s(ev.lifecycle)}</Badge><Badge tone="brand">Registration {s(ev.registrationState)}</Badge>
          <span className="text-sm">{formatDateRange(s(ev.Start_Date), s(ev.End_Date))} · {s(ev.registrationCount)} registered</span></span>}
        action={<>
          {status !== 'PUBLISHED' && status !== 'CANCELLED' && <Button variant="accent" loading={busy === 'publishEvent'} onClick={() => act('publishEvent', {}, 'Event published')} icon={<Send className="size-4" />}>Publish</Button>}
          {status === 'PUBLISHED' && <Button variant="secondary" loading={busy === 'unpublishEvent'} onClick={() => act('unpublishEvent', {}, 'Event unpublished')} icon={<EyeOff className="size-4" />}>Unpublish</Button>}
          {status !== 'CANCELLED' && <Button variant="danger" loading={busy === 'cancelEvent'} onClick={() => { const reason = prompt('Reason for cancelling (sent to registered students):'); if (reason !== null) void act('cancelEvent', { reason }, 'Event cancelled — students notified'); }} icon={<Ban className="size-4" />}>Cancel</Button>}
          <Button variant="ghost" loading={busy === 'archiveEvent'} onClick={() => { if (confirm('Archive this event? It will be hidden everywhere.')) void act('archiveEvent', {}, 'Event archived'); }} icon={<Archive className="size-4" />}>Archive</Button>
        </>} />
      <div className="mb-6 flex flex-wrap gap-2">
        {status === 'PUBLISHED' || status === 'CANCELLED' ? <ButtonLink href={`/events/${s(ev.Slug)}`} target="_blank" variant="secondary" size="sm" icon={<ExternalLink className="size-4" />}>View on website</ButtonLink> : null}
        <ButtonLink href={`/admin/registrations?event=${id}`} variant="secondary" size="sm" icon={<ClipboardList className="size-4" />}>Registrations</ButtonLink>
        <ButtonLink href={`/admin/results?event=${id}`} variant="secondary" size="sm" icon={<Trophy className="size-4" />}>Results</ButtonLink>
        {s(ev.driveFolderUrl) && <a href={s(ev.driveFolderUrl)} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] font-semibold ring-1 ring-line hover:ring-brand-300"><FolderOpen className="size-4" />Drive folder</a>}
      </div>
      <ButtonTabs className="mb-6" active={tab} onChange={setTab} tabs={[{ key: 'details', label: 'Details' }, { key: 'media', label: 'Poster & files' }, { key: 'categories', label: `Categories (${ev.categories.length})` }, { key: 'report', label: 'Report' }]} />

      {tab === 'details' && (
        <Card className="p-6 sm:p-8">
          <EventForm key={s(ev.Updated_At)} initial={ev} submitLabel="Save changes" onSubmit={async (data) => {
            try { const r = await api.admin.call<Row & { categories: Row[] }>('updateEvent', { id, data, updatedAt: ev.Updated_At }); setData(r); toast('Event saved — website updated'); void loadEvents(true); }
            catch (e) { throw new Error(e instanceof ApiError ? e.message : 'Could not save'); }
          }} />
        </Card>
      )}
      {tab === 'media' && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Event poster" subtitle="Saved to Events/{Event_ID}/Poster in Google Drive" />
            <div className="p-5">
              <div className="overflow-hidden rounded-2xl"><EventPoster url={s(ev.posterThumb)} name={s(ev.Event_Name)} type={s(ev.Event_Type)} start={s(ev.Start_Date)} end={s(ev.End_Date)} className="aspect-[4/3] w-full" /></div>
              <label className="mt-4 inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700">
                <Upload className="size-4" />{busy === 'eventPoster' ? 'Uploading…' : 'Upload poster'}<input type="file" accept={IMAGE_TYPES.join(',')} className="sr-only" onChange={(e) => upload('eventPoster', e)} />
              </label>
            </div>
          </Card>
          <Card>
            <CardHeader title="Rules & schedule documents" subtitle="PDF or image — shown as “Download rules” on the event page" />
            <div className="space-y-4 p-5">
              {s(ev.Rules_URL) && <a href={s(ev.Rules_URL)} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-semibold text-brand-700 underline">{s(ev.Rules_URL)}</a>}
              <div className="flex flex-wrap gap-3">
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-5 text-sm font-semibold ring-1 ring-line hover:ring-brand-300"><Upload className="size-4" />{busy === 'eventRules' ? 'Uploading…' : 'Upload rules'}<input type="file" accept={DOCUMENT_TYPES.join(',')} className="sr-only" onChange={(e) => upload('eventRules', e)} /></label>
                <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full px-5 text-sm font-semibold ring-1 ring-line hover:ring-brand-300"><Upload className="size-4" />{busy === 'eventSchedule' ? 'Uploading…' : 'Upload schedule'}<input type="file" accept={DOCUMENT_TYPES.join(',')} className="sr-only" onChange={(e) => upload('eventSchedule', e)} /></label>
              </div>
            </div>
          </Card>
        </div>
      )}
      {tab === 'categories' && (
        <>
          <Card className="mb-6">
            <CardHeader title="Generate categories" subtitle="Creates every combination of age group × gender × race (existing names are skipped)." />
            <div className="grid gap-4 p-5 md:grid-cols-5">
              <Field label="Age groups" htmlFor="ga" className="md:col-span-2"><Input id="ga" value={gen.ageGroups} onChange={(e) => setGen({ ...gen, ageGroups: e.target.value })} /></Field>
              <Field label="Genders" htmlFor="gg"><Input id="gg" value={gen.genders} onChange={(e) => setGen({ ...gen, genders: e.target.value })} /></Field>
              <Field label="Races" htmlFor="gr" className="md:col-span-2"><Input id="gr" value={gen.races} onChange={(e) => setGen({ ...gen, races: e.target.value })} /></Field>
              <Field label="Fee (optional)" htmlFor="gf"><Input id="gf" type="number" min={0} value={gen.entryFee} onChange={(e) => setGen({ ...gen, entryFee: e.target.value })} /></Field>
              <Field label="Max per category" htmlFor="gm"><Input id="gm" type="number" min={0} value={gen.maxParticipants} onChange={(e) => setGen({ ...gen, maxParticipants: e.target.value })} /></Field>
              <div className="flex items-end"><Button loading={busy === 'generateCategories'} icon={<Wand2 className="size-4" />}
                onClick={async () => { setBusy('generateCategories'); try { const r = await api.admin.call<{ created: number }>('generateCategories', { eventId: id, ...gen }); toast(`${r.created} categories created`); await reload(); } catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); } finally { setBusy(''); } }}>Generate</Button></div>
            </div>
          </Card>
          <EntityManager key={ev.categories.length} entity="eventCategories" noun="Category" fixedFilters={{ Event_ID: id }} statuses={['ACTIVE', 'CLOSED', 'INACTIVE']} pageSize={100} defaults={{ Status: 'ACTIVE' }}
            columns={[{ key: 'Category_Name', header: 'Category', primary: true }, { key: 'Age_Group', header: 'Age group' }, { key: 'Gender', header: 'Gender', type: 'label' },
              { key: 'Race_Type', header: 'Race' }, { key: 'Entry_Fee', header: 'Fee', render: (r) => (s(r.Entry_Fee) === '' ? 'Event fee' : formatMoney(s(r.Entry_Fee))) },
              { key: 'Maximum_Participants', header: 'Max' }, { key: 'Status', header: 'Status', type: 'badge' }]}
            fields={[{ name: 'Category_Name', label: 'Category name', required: true, full: true }, { name: 'Age_Group', label: 'Age group', placeholder: 'Under 10, 10-12, Senior…' },
              { name: 'Gender', label: 'Gender', type: 'select', options: ['MALE', 'FEMALE', 'MIXED', 'OPEN'] }, { name: 'Race_Type', label: 'Race type', placeholder: '500M Rink' },
              { name: 'Distance', label: 'Distance' }, { name: 'Entry_Fee', label: 'Entry fee (empty = event fee)', type: 'number' },
              { name: 'Maximum_Participants', label: 'Maximum participants', type: 'number' }, { name: 'Status', label: 'Status', type: 'select', options: ['ACTIVE', 'CLOSED', 'INACTIVE'] }]} />
        </>
      )}
      {tab === 'report' && (report.loading ? <LoadingState /> : report.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
            {[['Total', report.data.totals.total], ['Active', report.data.totals.active], ['Paid', report.data.totals.paid], ['Free', report.data.totals.free], ['Pending', report.data.totals.pending], ['Cancelled', report.data.totals.cancelled]].map(([k, v]) => <StatCard key={k as string} label={k as string} value={v as number} />)}
          </div>
          <p className="mt-3 text-sm text-muted">Revenue: <strong className="text-ink">{formatMoney(report.data.totals.revenue)}</strong></p>
          <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {[['By category', report.data.byCategory], ['By gender', report.data.byGender], ['By age group', report.data.byAgeGroup], ['By academy', report.data.byAcademy]].map(([k, v]) => (
              <Card key={k as string}><CardHeader title={k as string} /><div className="p-5"><BarList data={v as Record<string, number>} max={12} /></div></Card>
            ))}
          </div>
          <div className="mt-6"><ButtonLink href={`/admin/registrations?event=${id}`}>Participants & export</ButtonLink> <Link href="/admin/reports" className="ml-3 text-sm font-semibold text-brand-700">All reports</Link></div>
        </>
      ))}
    </>
  );
}

export default function AdminEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Suspense fallback={<LoadingState />}><Editor id={decodeURIComponent(id)} /></Suspense>;
}
