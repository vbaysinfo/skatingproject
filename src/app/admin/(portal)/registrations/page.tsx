'use client';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { Download, Hash, UserPlus, Search, FileSpreadsheet } from 'lucide-react';
import { api, ApiError, downloadText, type Paged } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import type { Row } from '@/lib/types';
import { formatDate, formatMoney, labelize } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, FormError, Input, Select } from '@/components/ui/Form';
import { StatusBadge } from '@/components/ui/Badge';
import { PagerButtons } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { EventSelect, StudentPicker } from '@/components/admin/Inputs';

const s = (v: unknown) => String(v ?? '');

function Registrations() {
  const toast = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const [eventId, setEventIdState] = useState(sp.get('event') || '');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Row | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [newReg, setNewReg] = useState({ studentId: '', categoryId: '', markPaid: false, transactionId: '' });
  const setEventId = (v: string) => { setEventIdState(v); setPage(1); router.replace(v ? `/admin/registrations?event=${v}` : '/admin/registrations'); };
  const { data, error, loading, reload } = useApi(() => api.admin.call<Paged<Row>>('getEventRegistrations', { eventId, q, status, paymentStatus, page }), [eventId, q, status, paymentStatus, page]);
  const cats = useApi(() => (eventId ? api.admin.call<{ categories: Row[] }>('getEvent', { id: eventId }).then((e) => e.categories) : Promise.resolve([] as Row[])), [eventId]);

  async function exportCsv(format: 'csv' | 'sheet') {
    setBusy('export');
    try {
      const r = await api.admin.call<{ filename: string; content?: string; url?: string; xlsxUrl?: string }>('exportEventRegistrations', { eventId, status, format });
      if (r.content) downloadText(r.filename, r.content); else if (r.url) window.open(r.url, '_blank');
    } catch (e) { toast(e instanceof ApiError ? e.message : 'Export failed', 'error'); } finally { setBusy(''); }
  }
  async function assignBibs() {
    const start = prompt('Start bib numbers from:', '101');
    if (!start) return;
    try { const r = await api.admin.call<{ assigned: number }>('assignBibs', { eventId, startFrom: Number(start) }); toast(`${r.assigned} bib numbers assigned`); await reload(); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); }
  }
  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setBusy('save'); setErr(null);
    try {
      await api.admin.call('updateRegistration', { id: edit.Registration_ID, data: { Bib_Number: edit.Bib_Number, Heat: edit.Heat, Lane: edit.Lane, Registration_Status: edit.Registration_Status, Remarks: edit.Remarks, Category_ID: edit.Category_ID }, updatedAt: edit.Updated_At });
      toast('Registration updated'); setEdit(null); await reload();
    } catch (x) { setErr(x instanceof ApiError ? x.message : 'Failed'); } finally { setBusy(''); }
  }
  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy('add'); setErr(null);
    try { await api.admin.call('createRegistration', { eventId, ...newReg }); toast('Registration added'); setAdding(false); setNewReg({ studentId: '', categoryId: '', markPaid: false, transactionId: '' }); await reload(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : 'Failed'); } finally { setBusy(''); }
  }

  const summary = (data as (Paged<Row> & { summary?: Record<string, number> }) | null)?.summary;
  return (
    <>
      <PortalHeader title="Registrations" subtitle="Event entries with categories, payments and bib numbers."
        action={eventId ? <>
          <Button variant="secondary" onClick={() => { setErr(null); setAdding(true); }} icon={<UserPlus className="size-4" />}>Add registration</Button>
          <Button variant="secondary" onClick={assignBibs} icon={<Hash className="size-4" />}>Assign bibs</Button>
          <Button variant="secondary" loading={busy === 'export'} onClick={() => exportCsv('csv')} icon={<Download className="size-4" />}>CSV</Button>
          <Button variant="secondary" onClick={() => exportCsv('sheet')} icon={<FileSpreadsheet className="size-4" />}>Google Sheet</Button>
        </> : <Button variant="secondary" loading={busy === 'export'} onClick={() => exportCsv('csv')} icon={<Download className="size-4" />}>Export all</Button>} />
      <div className="mb-4 grid gap-3 md:grid-cols-[2fr_1.5fr_1fr_1fr]">
        <EventSelect value={eventId} onChange={setEventId} />
        <label className="relative"><span className="sr-only">Search</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input className="pl-9" placeholder="Reg. no, student, bib, academy" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} /></label>
        <Select aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{['CONFIRMED', 'PENDING_PAYMENT', 'WAITLISTED', 'CANCELLED'].map((x) => <option key={x} value={x}>{labelize(x)}</option>)}</Select>
        <Select aria-label="Payment" value={paymentStatus} onChange={(e) => { setPaymentStatus(e.target.value); setPage(1); }}><option value="">All payments</option>{['PAID', 'PENDING', 'NOT_REQUIRED', 'REFUNDED', 'CANCELLED'].map((x) => <option key={x} value={x}>{labelize(x)}</option>)}</Select>
      </div>
      {summary && <p className="mb-3 text-sm text-muted">{summary.total} total · {summary.confirmed} confirmed · {summary.pendingPayment} pending payment · {summary.cancelled} cancelled</p>}
      {error ? <ErrorState message={error.message} /> : (
        <Card>
          <DataTable<Row> loading={loading && !data} rows={data?.items || []} rowKey={(r) => s(r.Registration_ID)} onRowClick={(r) => { setErr(null); setEdit({ ...r }); }}
            empty={<EmptyState title="No registrations found" />}
            columns={[
              { key: 'Registration_Number', header: 'Reg. No.', render: (r) => <span className="font-mono text-xs">{s(r.Registration_Number)}</span> },
              { key: 'Student_Name', header: 'Student', primary: true, render: (r) => <div><p className="font-semibold">{s(r.Student_Name)}</p><p className="text-xs text-muted">{s(r.Student_ID)} · {s(r.Academy)}</p></div> },
              { key: 'Event_Name', header: 'Event', hideOnMobile: true, render: (r) => <span className="line-clamp-1 max-w-48 text-xs">{s(r.Event_Name)}</span> },
              { key: 'Category_Name', header: 'Category', render: (r) => s(r.Category_Name) || 'General' },
              { key: 'Gender', header: 'Gender / Age', render: (r) => `${labelize(s(r.Gender))} · ${s(r.Age)}` },
              { key: 'Bib_Number', header: 'Bib', render: (r) => s(r.Bib_Number) || '—' },
              { key: 'Payment_Status', header: 'Payment', render: (r) => <div><StatusBadge status={s(r.Payment_Status)} /><p className="text-[11px] text-muted">{formatMoney(s(r.Amount))}</p></div> },
              { key: 'Registration_Status', header: 'Status', render: (r) => <StatusBadge status={s(r.Registration_Status)} /> },
              { key: 'Registration_Date', header: 'Date', hideOnMobile: true, render: (r) => formatDate(s(r.Registration_Date)) },
            ]} />
          {data && <div className="flex justify-end border-t border-line px-5 py-3"><PagerButtons page={data.page} totalPages={data.totalPages} onPage={setPage} /></div>}
        </Card>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Registration ${s(edit?.Registration_Number)}`}
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Close</Button><Button type="submit" form="reg-edit" loading={busy === 'save'}>Save</Button></>}>
        {edit && (
          <form id="reg-edit" onSubmit={saveEdit} className="grid gap-4 sm:grid-cols-3">
            <p className="text-sm sm:col-span-3"><strong>{s(edit.Student_Name)}</strong> · {s(edit.Event_Name)} · Payment {s(edit.Payment_ID)} <StatusBadge status={s(edit.Payment_Status)} /></p>
            <Field label="Bib" htmlFor="eb"><Input id="eb" value={s(edit.Bib_Number)} onChange={(e) => setEdit({ ...edit, Bib_Number: e.target.value })} /></Field>
            <Field label="Heat" htmlFor="eh"><Input id="eh" value={s(edit.Heat)} onChange={(e) => setEdit({ ...edit, Heat: e.target.value })} /></Field>
            <Field label="Lane" htmlFor="el"><Input id="el" value={s(edit.Lane)} onChange={(e) => setEdit({ ...edit, Lane: e.target.value })} /></Field>
            <Field label="Category" htmlFor="ecat" className="sm:col-span-2"><Select id="ecat" value={s(edit.Category_ID)} onChange={(e) => setEdit({ ...edit, Category_ID: e.target.value })}>
              <option value="">General</option>{(cats.data || []).map((c) => <option key={s(c.Category_ID)} value={s(c.Category_ID)}>{s(c.Category_Name)}</option>)}</Select></Field>
            <Field label="Status" htmlFor="est"><Select id="est" value={s(edit.Registration_Status)} onChange={(e) => setEdit({ ...edit, Registration_Status: e.target.value })}>
              {['CONFIRMED', 'PENDING_PAYMENT', 'WAITLISTED', 'CANCELLED'].map((x) => <option key={x} value={x}>{labelize(x)}</option>)}</Select></Field>
            <Field label="Remarks" htmlFor="erm" className="sm:col-span-3"><Input id="erm" value={s(edit.Remarks)} onChange={(e) => setEdit({ ...edit, Remarks: e.target.value })} /></Field>
            <p className="text-xs text-muted sm:col-span-3">To mark a payment as received or refunded, use Payments.</p>
            <div className="sm:col-span-3"><FormError message={err} /></div>
          </form>
        )}
      </Modal>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add registration"
        footer={<><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit" form="reg-add" loading={busy === 'add'}>Register student</Button></>}>
        <form id="reg-add" onSubmit={add} className="grid gap-4">
          <Field label="Student" htmlFor="as" required><StudentPicker id="as" value={newReg.studentId} onChange={(v) => setNewReg({ ...newReg, studentId: v })} /></Field>
          <Field label="Category" htmlFor="ac"><Select id="ac" value={newReg.categoryId} onChange={(e) => setNewReg({ ...newReg, categoryId: e.target.value })}>
            <option value="">General</option>{(cats.data || []).map((c) => <option key={s(c.Category_ID)} value={s(c.Category_ID)}>{s(c.Category_Name)}</option>)}</Select></Field>
          <Checkbox checked={newReg.markPaid} onChange={(e) => setNewReg({ ...newReg, markPaid: e.target.checked })} label="Payment received offline — mark as paid" />
          {newReg.markPaid && <Field label="Transaction / receipt reference" htmlFor="at"><Input id="at" value={newReg.transactionId} onChange={(e) => setNewReg({ ...newReg, transactionId: e.target.value })} /></Field>}
          <p className="text-xs text-muted">Admin registrations bypass the registration deadline. Duplicate checks still apply.</p>
          <FormError message={err} />
        </form>
      </Modal>
    </>
  );
}

export default function Page() { return <Suspense><Registrations /></Suspense>; }
