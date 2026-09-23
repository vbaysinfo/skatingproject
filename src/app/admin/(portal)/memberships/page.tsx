'use client';
import { useState } from 'react';
import { Check, X, RefreshCw, PauseCircle, PlayCircle, Plus } from 'lucide-react';
import { api, ApiError, type Paged } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import type { Row } from '@/lib/types';
import { formatDate, formatMoney, labelize } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { ButtonTabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, FormError, Input, Select } from '@/components/ui/Form';
import { StatusBadge } from '@/components/ui/Badge';
import { PagerButtons } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { EntityManager } from '@/components/admin/EntityManager';
import { StudentPicker } from '@/components/admin/Inputs';

const s = (v: unknown) => String(v ?? '');
const PLAN_TYPES = ['STUDENT', 'ATHLETE', 'COACH', 'OFFICIAL', 'ACADEMY', 'INSTITUTION', 'OTHER'];

function MembershipList() {
  const toast = useToast();
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const [nm, setNm] = useState({ studentId: '', planId: '', activate: true, markPaid: true, transactionId: '' });
  const [err, setErr] = useState<string | null>(null);
  const { data, error, loading, reload } = useApi(() => api.admin.call<Paged<Row>>('getMemberships', { status, q, page }), [status, q, page]);
  const plans = useApi(() => api.admin.list('membershipPlans', { pageSize: 100 }).then((r) => r.items), []);

  async function act(action: string, payload: Record<string, unknown>, msg: string) {
    try { await api.admin.call(action, payload); toast(msg); await reload(); } catch (e) { toast(e instanceof ApiError ? e.message : 'Action failed', 'error'); }
  }
  async function approve(r: Row) {
    const paid = s(r.Payment_Status) === 'SUCCESS' || Number(r.Fee) === 0;
    if (!paid && !confirm('Payment is not recorded as successful. Mark it as paid (offline) and approve?')) return;
    await act('approveMembership', { id: r.Membership_ID, markPaid: !paid }, 'Membership approved — MEM number and digital card issued');
  }
  async function create(e: React.FormEvent) {
    e.preventDefault(); setErr(null);
    try { await api.admin.call('createMembership', nm); toast('Membership created'); setCreating(false); await reload(); } catch (x) { setErr(x instanceof ApiError ? x.message : 'Failed'); }
  }
  return (
    <>
      <div className="mb-4 flex flex-wrap gap-3">
        <Input className="min-w-56 flex-1" placeholder="Search member number, student or email" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} aria-label="Search" />
        <Select className="w-48" aria-label="Status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{['PENDING', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'].map((x) => <option key={x}>{x}</option>)}</Select>
        <Button onClick={() => { setErr(null); setCreating(true); }} icon={<Plus className="size-4" />}>Add membership</Button>
      </div>
      {error ? <ErrorState message={error.message} /> : (
        <Card>
          <DataTable<Row> loading={loading && !data} rows={data?.items || []} rowKey={(r) => s(r.Membership_ID)} empty={<EmptyState title="No memberships" />}
            columns={[
              { key: 'Student_Name', header: 'Member', primary: true, render: (r) => <div className="flex items-center gap-3">{s(r.Photo_URL) ? <img src={s(r.Photo_URL)} alt="" className="size-9 rounded-full object-cover" /> : null}<div><p className="font-semibold">{s(r.Student_Name)}</p><p className="font-mono text-xs text-muted">{s(r.Membership_Number) || s(r.Membership_ID)}</p></div></div> },
              { key: 'Plan_Name', header: 'Plan', render: (r) => <div><p>{s(r.Plan_Name)}</p><p className="text-xs text-muted">{labelize(s(r.Plan_Type))} · {formatMoney(s(r.Fee))}</p></div> },
              { key: 'validity', header: 'Validity', render: (r) => (s(r.Start_Date) ? `${formatDate(s(r.Start_Date))} – ${formatDate(s(r.Expiry_Date))}` : '—') },
              { key: 'Payment_Status', header: 'Payment', render: (r) => <StatusBadge status={s(r.Payment_Status) || 'NONE'} /> },
              { key: 'Status', header: 'Status', render: (r) => <StatusBadge status={s(r.Status)} /> },
            ]}
            actions={(r) => {
              const st = s(r.Status);
              return (
                <div className="flex justify-end gap-1">
                  {st === 'PENDING' && <Button size="sm" onClick={() => approve(r)} icon={<Check className="size-4" />}>Approve</Button>}
                  {st === 'PENDING' && <Button size="sm" variant="ghost" onClick={() => { const reason = prompt('Reason for rejection (sent to the student):'); if (reason !== null) void act('rejectMembership', { id: r.Membership_ID, reason }, 'Membership rejected'); }} icon={<X className="size-4" />}>Reject</Button>}
                  {s(r.Membership_Number) && <Button size="sm" variant="secondary" onClick={() => { if (confirm('Renew for another term (records an offline payment)?')) void act('renewMembership', { id: r.Membership_ID, recordPayment: true }, 'Membership renewed'); }} icon={<RefreshCw className="size-4" />}>Renew</Button>}
                  {st === 'ACTIVE' && <Button size="sm" variant="ghost" onClick={() => { const reason = prompt('Reason for suspension:'); if (reason !== null) void act('setMembershipStatus', { id: r.Membership_ID, status: 'SUSPENDED', reason }, 'Membership suspended'); }} icon={<PauseCircle className="size-4" />}>Suspend</Button>}
                  {st === 'SUSPENDED' && <Button size="sm" variant="ghost" onClick={() => act('setMembershipStatus', { id: r.Membership_ID, status: 'ACTIVE' }, 'Membership reactivated')} icon={<PlayCircle className="size-4" />}>Reactivate</Button>}
                </div>
              );
            }} />
          {data && <div className="flex justify-between border-t border-line px-5 py-3 text-sm text-muted"><span>{data.total} memberships</span><PagerButtons page={data.page} totalPages={data.totalPages} onPage={setPage} /></div>}
        </Card>
      )}
      <Modal open={creating} onClose={() => setCreating(false)} title="Add membership"
        footer={<><Button variant="secondary" onClick={() => setCreating(false)}>Cancel</Button><Button type="submit" form="mem-form">Create</Button></>}>
        <form id="mem-form" onSubmit={create} className="grid gap-4">
          <Field label="Student" htmlFor="ms" required><StudentPicker id="ms" value={nm.studentId} onChange={(v) => setNm({ ...nm, studentId: v })} /></Field>
          <Field label="Plan" htmlFor="mp" required><Select id="mp" value={nm.planId} onChange={(e) => setNm({ ...nm, planId: e.target.value })} required><option value="">Select</option>
            {(plans.data || []).map((p) => <option key={s(p.Plan_ID)} value={s(p.Plan_ID)}>{s(p.Plan_Name)} — {formatMoney(s(p.Fee))}</option>)}</Select></Field>
          <Checkbox checked={nm.markPaid} onChange={(e) => setNm({ ...nm, markPaid: e.target.checked })} label="Payment received offline — mark as paid" />
          <Checkbox checked={nm.activate} onChange={(e) => setNm({ ...nm, activate: e.target.checked })} label="Approve now (issue MEM number & digital card)" />
          {nm.markPaid && <Field label="Receipt / transaction reference" htmlFor="mt"><Input id="mt" value={nm.transactionId} onChange={(e) => setNm({ ...nm, transactionId: e.target.value })} /></Field>}
          <FormError message={err} />
        </form>
      </Modal>
    </>
  );
}

export default function AdminMembershipsPage() {
  const [tab, setTab] = useState('members');
  return (
    <>
      <PortalHeader title="Memberships" subtitle="Approve applications, renew, suspend, and manage membership plans and prices." />
      <ButtonTabs className="mb-5" active={tab} onChange={setTab} tabs={[{ key: 'members', label: 'Memberships' }, { key: 'plans', label: 'Plans & prices' }]} />
      {tab === 'members' ? <MembershipList /> : (
        <EntityManager entity="membershipPlans" noun="Plan" statuses={['ACTIVE', 'INACTIVE', 'ARCHIVED']} defaults={{ Status: 'ACTIVE', Duration_Months: 12, Display_Order: 100 }}
          columns={[{ key: 'Plan_Name', header: 'Plan', primary: true }, { key: 'Plan_Type', header: 'Type', type: 'label' }, { key: 'Fee', header: 'Fee', type: 'money' },
            { key: 'Duration_Months', header: 'Months' }, { key: 'Featured', header: 'Featured', type: 'bool' }, { key: 'Status', header: 'Status', type: 'badge' }]}
          fields={[{ name: 'Plan_Name', label: 'Plan name', required: true }, { name: 'Plan_Type', label: 'Type', type: 'select', options: PLAN_TYPES, required: true },
            { name: 'Fee', label: 'Annual fee', type: 'number', required: true }, { name: 'Duration_Months', label: 'Duration (months)', type: 'number', required: true },
            { name: 'Description', label: 'Description', type: 'textarea' }, { name: 'Benefits', label: 'Benefits (one per line)', type: 'textarea' },
            { name: 'Eligibility', label: 'Eligibility' }, { name: 'Display_Order', label: 'Display order', type: 'number' },
            { name: 'Status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] }, { name: 'Featured', label: 'Featured', type: 'bool', help: 'Highlight as most popular' }]} />
      )}
    </>
  );
}
