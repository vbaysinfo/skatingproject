'use client';
import Link from 'next/link';
import { use, useEffect, useState } from 'react';
import { CheckCircle2, Ban, FolderOpen, Download, Save } from 'lucide-react';
import { api, ApiError, downloadBase64 } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import type { Certificate, Membership, Payment, Registration, StudentProfile, StudentResult, Achievement } from '@/lib/types';
import { formatDate, formatDateRange, formatMoney, initials, labelize, ordinal } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { ButtonTabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/Badge';
import { ErrorState, LoadingState, EmptyState } from '@/components/ui/States';
import { Field, FormError, Textarea } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { StudentFields, EMPTY_STUDENT, type StudentForm } from '@/components/portal/StudentFields';

type Detail = {
  student: StudentProfile & { adminNotes: string; driveFolderUrl: string }; raw: Record<string, unknown>;
  account: { userId: string; email: string; status: string; lastLogin: string; provider: string } | null;
  memberships: Membership[]; registrations: Registration[]; results: StudentResult[]; certificates: Certificate[]; achievements: Achievement[];
  documents: { id: string; type: string; fileName: string; status: string; createdAt: string; driveUrl: string }[]; payments: Payment[];
};

function List({ items, empty, render }: { items: unknown[]; empty: string; render: (x: never, i: number) => React.ReactNode }) {
  if (!items.length) return <div className="p-5"><EmptyState title={empty} /></div>;
  return <ul className="divide-y divide-line">{items.map((x, i) => <li key={i} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">{render(x as never, i)}</li>)}</ul>;
}

export default function AdminStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const toast = useToast();
  const [tab, setTab] = useState('profile');
  const { data, error, loading, setData } = useApi(() => api.admin.call<Detail>('getStudent', { id }), [id]);
  const [form, setForm] = useState<StudentForm>(EMPTY_STUDENT);
  const [notes, setNotes] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    const f = { ...EMPTY_STUDENT };
    (Object.keys(f) as (keyof StudentForm)[]).forEach((k) => { f[k] = String((data.student as unknown as Record<string, unknown>)[k] ?? ''); });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm(f); setNotes(data.student.adminNotes || '');
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr(null);
    try { setData(await api.admin.call<Detail>('updateStudent', { id, data: { ...form, adminNotes: notes }, updatedAt: data?.student.updatedAt })); toast('Student updated'); }
    catch (x) { setErr(x instanceof ApiError ? x.message : 'Failed'); } finally { setBusy(false); }
  }
  async function setStatus(status: string) {
    const reason = status === 'SUSPENDED' ? prompt('Reason for suspension (kept in admin notes):') : '';
    if (reason === null) return;
    try { await api.admin.call('updateStudentStatus', { id, status, reason }); setData(await api.admin.call<Detail>('getStudent', { id })); toast(`Student ${status.toLowerCase()}`); }
    catch (x) { toast(x instanceof ApiError ? x.message : 'Failed', 'error'); }
  }
  async function download(docId: string) {
    try { const d = await api.downloadDocument(docId); downloadBase64(d.fileName, d.base64, d.mimeType); } catch (x) { toast(x instanceof ApiError ? x.message : 'Failed', 'error'); }
  }

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error?.message} />;
  const st = data.student;
  return (
    <>
      <Link href="/admin/students" className="text-sm font-semibold text-brand-700">← Students</Link>
      <div className="mt-3"><PortalHeader
        title={<span className="flex items-center gap-4">{st.photoUrl ? <img src={st.photoUrl} alt="" className="size-14 rounded-2xl object-cover" /> : <span className="grid size-14 place-items-center rounded-2xl bg-brand-600 text-xl text-white">{initials(st.fullName)}</span>}{st.fullName}</span>}
        subtitle={<span className="flex flex-wrap items-center gap-2"><span className="font-mono">{st.id}</span><StatusBadge status={st.status} /><span>{st.age} yrs · {labelize(st.gender)} · {st.academy || 'No academy'}</span>
          {data.account && <span className="text-xs">Account: {data.account.email} ({data.account.provider}) · last login {formatDate(data.account.lastLogin)}</span>}</span>}
        action={<>
          {st.status !== 'ACTIVE' && <Button onClick={() => setStatus('ACTIVE')} icon={<CheckCircle2 className="size-4" />}>Approve / activate</Button>}
          {st.status !== 'SUSPENDED' && <Button variant="danger" onClick={() => setStatus('SUSPENDED')} icon={<Ban className="size-4" />}>Suspend</Button>}
          {st.driveFolderUrl && <a href={st.driveFolderUrl} target="_blank" rel="noopener noreferrer" className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold ring-1 ring-line"><FolderOpen className="size-4" />Drive folder</a>}
        </>} /></div>
      <ButtonTabs className="mb-6" active={tab} onChange={setTab} tabs={[{ key: 'profile', label: 'Profile' }, { key: 'membership', label: `Membership (${data.memberships.length})` },
        { key: 'events', label: `Registrations (${data.registrations.length})` }, { key: 'results', label: `Results (${data.results.length})` },
        { key: 'certificates', label: `Certificates (${data.certificates.length})` }, { key: 'documents', label: `Documents (${data.documents.length})` }, { key: 'payments', label: 'Payments' }]} />
      {tab === 'profile' && (
        <Card className="p-6 sm:p-8">
          <form onSubmit={save} className="space-y-8">
            <StudentFields value={form} onChange={setForm} />
            <Field label="Admin notes (never shown to the student)" htmlFor="an"><Textarea id="an" value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
            <p className="text-xs text-muted">Consent: terms accepted {formatDate(st.termsAcceptedAt) || '—'}{st.guardianConsentName ? ` · guardian ${st.guardianConsentName} on ${formatDate(st.guardianConsentAt)}` : ''}</p>
            <FormError message={err} />
            <Button type="submit" loading={busy} icon={<Save className="size-4" />}>Save student</Button>
          </form>
        </Card>
      )}
      {tab === 'membership' && <Card><CardHeader title="Memberships" action={<Link href="/admin/memberships" className="text-sm font-bold text-brand-700">Manage</Link>} />
        <List items={data.memberships} empty="No memberships" render={(m: Membership) => <><div><p className="font-semibold">{m.planName} <span className="font-mono text-xs text-muted">{m.membershipNumber || m.id}</span></p><p className="text-sm text-muted">{m.startDate ? `${formatDate(m.startDate)} – ${formatDate(m.expiryDate)}` : 'Not yet approved'}</p></div><StatusBadge status={m.status} /></>} /></Card>}
      {tab === 'events' && <Card><CardHeader title="Event registrations" />
        <List items={data.registrations} empty="No registrations" render={(r: Registration) => <><div><p className="font-semibold">{r.eventName}</p><p className="text-sm text-muted">{r.registrationNumber} · {formatDateRange(r.eventStart, r.eventEnd)} · {r.categoryName || 'General'}{r.bibNumber ? ` · Bib ${r.bibNumber}` : ''}</p></div><div className="flex gap-2"><StatusBadge status={r.status} /><StatusBadge status={r.paymentStatus} /></div></>} /></Card>}
      {tab === 'results' && <Card><CardHeader title="Results (including unpublished)" />
        <List items={data.results} empty="No results" render={(r: StudentResult) => <><div><p className="font-semibold">{r.eventName}</p><p className="text-sm text-muted">{r.categoryName} · {r.time || '—'} · {r.points} pts</p></div><span className="font-display text-lg font-bold">{r.status === 'FINISHED' ? ordinal(r.position) : r.status}</span></>} /></Card>}
      {tab === 'certificates' && <Card><CardHeader title="Certificates" action={<Link href="/admin/certificates" className="text-sm font-bold text-brand-700">Create</Link>} />
        <List items={data.certificates} empty="No certificates" render={(c: Certificate) => <><div><p className="font-semibold">{c.title}</p><p className="text-sm text-muted">{c.certificateNumber} · {formatDate(c.issueDate)}</p></div><div className="flex items-center gap-2"><StatusBadge status={c.status} />{c.certificateUrl && <a href={c.certificateUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-brand-700">PDF</a>}</div></>} /></Card>}
      {tab === 'documents' && <Card><CardHeader title="Documents" subtitle="Private files in the student's Drive folder" />
        <List items={data.documents} empty="No documents" render={(d: Detail['documents'][number]) => <><div><p className="font-semibold">{labelize(d.type)}</p><p className="text-sm text-muted">{d.fileName} · {formatDate(d.createdAt)}</p></div><div className="flex gap-2"><button type="button" onClick={() => download(d.id)} className="inline-flex items-center gap-1 text-sm font-bold text-brand-700"><Download className="size-4" />Download</button><a href={d.driveUrl} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-muted">Drive</a></div></>} /></Card>}
      {tab === 'payments' && <Card><CardHeader title="Payments" />
        <List items={data.payments} empty="No payments" render={(p: Payment) => <><div><p className="font-semibold">{labelize(p.type)} · {formatMoney(p.amount, p.currency)}</p><p className="font-mono text-xs text-muted">{p.id} {p.transactionId && `· ${p.transactionId}`}</p></div><StatusBadge status={p.status} /></>} /></Card>}
    </>
  );
}
