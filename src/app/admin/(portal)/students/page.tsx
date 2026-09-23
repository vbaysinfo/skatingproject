'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Download, UserPlus, Search } from 'lucide-react';
import { api, ApiError, downloadText, type Paged } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import type { Row } from '@/lib/types';
import { initials, labelize } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { FormError, Input, Select } from '@/components/ui/Form';
import { StatusBadge } from '@/components/ui/Badge';
import { PagerButtons } from '@/components/ui/Pagination';
import { Modal } from '@/components/ui/Modal';
import { ErrorState, EmptyState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { StudentFields, EMPTY_STUDENT, type StudentForm } from '@/components/portal/StudentFields';

const s = (v: unknown) => String(v ?? '');

export default function AdminStudentsPage() {
  const router = useRouter();
  const toast = useToast();
  const [f, setF] = useState({ q: '', status: '', gender: '', city: '', membership: '' });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<StudentForm>(EMPTY_STUDENT);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, error, loading, reload } = useApi(() => api.admin.call<Paged<Row> & { facets: { cities: string[] } }>('getStudents', { ...f, page }), [f, page]);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setPage(1); };

  async function exportCsv() {
    try { const r = await api.admin.export({ type: 'students', status: f.status }); if (r.content) downloadText(r.filename, r.content); }
    catch (e) { toast(e instanceof ApiError ? e.message : 'Export failed', 'error'); }
  }
  async function bulk(status: string) {
    if (!confirm(`Set ${selected.size} students to ${status}?`)) return;
    for (const id of selected) { try { await api.admin.call('updateStudentStatus', { id, status }); } catch { /* continue */ } }
    toast(`${selected.size} students updated`); setSelected(new Set()); await reload();
  }
  async function create(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { const r = await api.admin.call<{ student: { id: string } }>('createStudent', { data: { ...form, status: 'ACTIVE' } }); toast('Student created'); setAdding(false); router.push(`/admin/students/${r.student.id}`); }
    catch (x) { setErr(x instanceof ApiError ? x.message : 'Failed'); } finally { setBusy(false); }
  }
  return (
    <>
      <PortalHeader title="Students" subtitle="Search, approve, suspend and manage athlete records."
        action={<><Button variant="secondary" onClick={exportCsv} icon={<Download className="size-4" />}>Export</Button><Button onClick={() => { setForm(EMPTY_STUDENT); setErr(null); setAdding(true); }} icon={<UserPlus className="size-4" />}>Add student</Button></>} />
      <div className="mb-4 grid gap-3 md:grid-cols-6">
        <label className="relative md:col-span-2"><span className="sr-only">Search</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input className="pl-9" placeholder="Name, ID, mobile, email, academy" value={f.q} onChange={set('q')} /></label>
        <Select aria-label="Status" value={f.status} onChange={set('status')}><option value="">All statuses</option>{['ACTIVE', 'PENDING', 'SUSPENDED', 'INACTIVE'].map((x) => <option key={x}>{x}</option>)}</Select>
        <Select aria-label="Gender" value={f.gender} onChange={set('gender')}><option value="">All genders</option>{['MALE', 'FEMALE', 'OTHER'].map((x) => <option key={x} value={x}>{labelize(x)}</option>)}</Select>
        <Select aria-label="City" value={f.city} onChange={set('city')}><option value="">All cities</option>{(data?.facets?.cities || []).map((c) => <option key={c}>{c}</option>)}</Select>
        <Select aria-label="Membership" value={f.membership} onChange={set('membership')}><option value="">Any membership</option><option value="ACTIVE">Active member</option><option value="NONE">Not a member</option></Select>
      </div>
      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-brand-50 px-4 py-2 text-sm ring-1 ring-brand-100">
          <strong>{selected.size} selected</strong><Button size="sm" onClick={() => bulk('ACTIVE')}>Approve</Button><Button size="sm" variant="secondary" onClick={() => bulk('SUSPENDED')}>Suspend</Button>
          <button className="ml-auto text-xs font-semibold" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
      {error ? <ErrorState message={error.message} /> : (
        <Card>
          <DataTable<Row> loading={loading && !data} rows={data?.items || []} rowKey={(r) => s(r.Student_ID)} onRowClick={(r) => router.push(`/admin/students/${s(r.Student_ID)}`)}
            selectable selected={selected} onSelect={setSelected} empty={<EmptyState title="No students found" />}
            columns={[
              { key: 'Full_Name', header: 'Student', primary: true, render: (r) => <div className="flex items-center gap-3">
                {s(r.Photo_Thumb) ? <img src={s(r.Photo_Thumb)} alt="" className="size-9 rounded-full object-cover" /> : <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{initials(s(r.Full_Name))}</span>}
                <div><p className="font-semibold">{s(r.Full_Name)}</p><p className="font-mono text-xs text-muted">{s(r.Student_ID)}</p></div></div> },
              { key: 'Age', header: 'Age / Gender', render: (r) => `${s(r.Age)} · ${labelize(s(r.Gender))}` },
              { key: 'Academy_Name', header: 'Academy', render: (r) => s(r.Academy_Name) || '—' },
              { key: 'City', header: 'City' },
              { key: 'Parent_Mobile', header: 'Contact', hideOnMobile: true, render: (r) => <div className="text-xs"><p>{s(r.Parent_Mobile)}</p><p className="text-muted">{s(r.Email)}</p></div> },
              { key: 'Membership_Number', header: 'Membership', render: (r) => (s(r.Membership_Number) ? <span className="font-mono text-xs">{s(r.Membership_Number)}</span> : '—') },
              { key: 'Status', header: 'Status', render: (r) => <StatusBadge status={s(r.Status)} /> },
            ]} />
          {data && <div className="flex justify-between border-t border-line px-5 py-3 text-sm text-muted"><span>{data.total} students</span><PagerButtons page={data.page} totalPages={data.totalPages} onPage={setPage} /></div>}
        </Card>
      )}
      <Modal open={adding} onClose={() => setAdding(false)} title="Add student" size="xl"
        footer={<><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit" form="stu-form" loading={busy}>Create student</Button></>}>
        <form id="stu-form" onSubmit={create} className="space-y-6">
          <StudentFields value={form} onChange={setForm} />
          <p className="text-xs text-muted">The athlete can later sign in with Google using the same email to access this record.</p>
          <FormError message={err} />
        </form>
      </Modal>
    </>
  );
}
