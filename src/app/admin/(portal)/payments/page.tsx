'use client';
import { useState } from 'react';
import { Download } from 'lucide-react';
import { api, ApiError, downloadText, type Paged } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import type { Row } from '@/lib/types';
import { formatMoney, labelize } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card, StatCard } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Field, FormError, Input, Select } from '@/components/ui/Form';
import { StatusBadge } from '@/components/ui/Badge';
import { PagerButtons } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

const s = (v: unknown) => String(v ?? '');

export default function AdminPaymentsPage() {
  const toast = useToast();
  const [f, setF] = useState({ status: '', type: '', q: '', from: '', to: '' });
  const [page, setPage] = useState(1);
  const [edit, setEdit] = useState<Row | null>(null);
  const [upd, setUpd] = useState({ status: 'SUCCESS', transactionId: '', remarks: '' });
  const [err, setErr] = useState<string | null>(null);
  const { data, error, loading, reload } = useApi(() => api.admin.call<Paged<Row> & { summary: { success: number; pending: number; refunded: number; count: number } }>('getPayments', { ...f, page }), [f, page]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setPage(1); };

  async function save(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    try { await api.admin.call('updatePayment', { paymentId: edit!.Payment_ID, ...upd }); toast('Payment updated'); setEdit(null); await reload(); }
    catch (x) { setErr(x instanceof ApiError ? x.message : 'Failed'); }
  }
  async function exportCsv() {
    try { const r = await api.admin.export({ type: 'payments', status: f.status, from: f.from, to: f.to, paymentType: f.type }); if (r.content) downloadText(r.filename, r.content); }
    catch (x) { toast(x instanceof ApiError ? x.message : 'Export failed', 'error'); }
  }
  return (
    <>
      <PortalHeader title="Payments" subtitle="Online payments are confirmed by verified gateway responses. Verify manual (offline) payments here." action={<Button variant="secondary" onClick={exportCsv} icon={<Download className="size-4" />}>Export CSV</Button>} />
      {data && <div className="mb-5 grid gap-4 sm:grid-cols-3"><StatCard label="Received" value={formatMoney(data.summary.success)} tone="green" /><StatCard label="Pending" value={formatMoney(data.summary.pending)} tone="accent" /><StatCard label="Refunded" value={formatMoney(data.summary.refunded)} tone="slate" /></div>}
      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <Input placeholder="Payment ID, transaction, student" value={f.q} onChange={set('q')} aria-label="Search" className="md:col-span-2" />
        <Select aria-label="Status" value={f.status} onChange={set('status')}><option value="">All statuses</option>{['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED'].map((x) => <option key={x}>{x}</option>)}</Select>
        <Select aria-label="Type" value={f.type} onChange={set('type')}><option value="">All types</option>{['EVENT_REGISTRATION', 'MEMBERSHIP', 'MEMBERSHIP_RENEWAL', 'PROGRAM'].map((x) => <option key={x} value={x}>{labelize(x)}</option>)}</Select>
        <div className="flex gap-2"><Input type="date" aria-label="From" value={f.from} onChange={set('from')} /><Input type="date" aria-label="To" value={f.to} onChange={set('to')} /></div>
      </div>
      {error ? <ErrorState message={error.message} /> : (
        <Card>
          <DataTable<Row> loading={loading && !data} rows={data?.items || []} rowKey={(r) => s(r.Payment_ID)} empty={<EmptyState title="No payments found" />}
            onRowClick={(r) => { setErr(null); setUpd({ status: s(r.Payment_Status) === 'PENDING' ? 'SUCCESS' : s(r.Payment_Status), transactionId: s(r.Transaction_ID), remarks: '' }); setEdit(r); }}
            columns={[
              { key: 'Payment_ID', header: 'Payment', primary: true, render: (r) => <div><p className="font-mono text-xs font-semibold">{s(r.Payment_ID)}</p><p className="text-xs text-muted">{s(r.Created_At).slice(0, 10)}</p></div> },
              { key: 'Student_Name', header: 'Student', render: (r) => s(r.Student_Name) || s(r.Student_ID) },
              { key: 'Payment_Type', header: 'Type', render: (r) => labelize(s(r.Payment_Type)) },
              { key: 'Amount', header: 'Amount', render: (r) => <span className="font-semibold">{formatMoney(s(r.Amount), s(r.Currency) || 'INR')}</span> },
              { key: 'Gateway', header: 'Gateway', hideOnMobile: true },
              { key: 'Transaction_ID', header: 'Transaction', hideOnMobile: true, render: (r) => <span className="font-mono text-xs">{s(r.Transaction_ID) || '—'}</span> },
              { key: 'Payment_Status', header: 'Status', render: (r) => <StatusBadge status={s(r.Payment_Status)} /> },
            ]} />
          {data && <div className="flex justify-between border-t border-line px-5 py-3 text-sm text-muted"><span>{data.total} payments</span><PagerButtons page={data.page} totalPages={data.totalPages} onPage={setPage} /></div>}
        </Card>
      )}
      <Modal open={!!edit} onClose={() => setEdit(null)} title={`Payment ${s(edit?.Payment_ID)}`}
        footer={<><Button variant="secondary" onClick={() => setEdit(null)}>Close</Button><Button type="submit" form="pay-form">Update</Button></>}>
        {edit && (
          <form id="pay-form" onSubmit={save} className="grid gap-4">
            <p className="text-sm text-muted">{s(edit.Remarks)}</p>
            <Field label="Status" htmlFor="ps"><Select id="ps" value={upd.status} onChange={(e) => setUpd({ ...upd, status: e.target.value })}>{['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED'].map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Field label="Transaction / receipt reference" htmlFor="pt"><Input id="pt" value={upd.transactionId} onChange={(e) => setUpd({ ...upd, transactionId: e.target.value })} /></Field>
            <Field label="Remarks" htmlFor="pr"><Input id="pr" value={upd.remarks} onChange={(e) => setUpd({ ...upd, remarks: e.target.value })} /></Field>
            <p className="text-xs text-muted">Marking SUCCESS confirms the linked registration / membership / program. Card details are never stored.</p>
            <FormError message={err} />
          </form>
        )}
      </Modal>
    </>
  );
}
