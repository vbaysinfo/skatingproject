'use client';
import { useState } from 'react';
import { Plus, RotateCw, Ban, Send, ExternalLink } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import type { Row } from '@/lib/types';
import { PortalHeader } from '@/components/portal/PortalShell';
import { EntityManager } from '@/components/admin/EntityManager';
import { EventSelect, StudentPicker } from '@/components/admin/Inputs';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Checkbox, Field, FormError, Input, Select } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/lib/use-api';

const s = (v: unknown) => String(v ?? '');

export default function AdminCertificatesPage() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({ studentId: '', eventId: '', certificationId: '', type: 'Certificate of Achievement', position: '', title: '', issueDate: '', expiryDate: '', generatePdf: true, status: 'ISSUED' });
  const certs = useApi(() => api.admin.list('certifications', { pageSize: 200 }).then((r) => r.items), []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try { const c = await api.admin.call<{ certificateNumber: string }>('createCertificate', f); toast(`Certificate ${c.certificateNumber} issued`); setOpen(false); setKey((k) => k + 1); }
    catch (x) { setErr(x instanceof ApiError ? x.message : 'Failed'); } finally { setBusy(false); }
  }
  async function act(action: string, id: string, msg: string) {
    try { await api.admin.call(action, { id }); toast(msg); setKey((k) => k + 1); } catch (x) { toast(x instanceof ApiError ? x.message : 'Failed', 'error'); }
  }
  return (
    <>
      <PortalHeader title="Certificates" subtitle="Certificate numbers (CERT-…) and verification codes are generated automatically; PDFs are saved to Certificates/{Student_ID} in Drive."
        action={<Button variant="accent" onClick={() => { setErr(null); setOpen(true); }} icon={<Plus className="size-4" />}>Create certificate</Button>} />
      <EntityManager key={key} entity="certificates" noun="Certificate" canCreate={false} canDelete={false} statuses={['DRAFT', 'ISSUED', 'REVOKED']} searchPlaceholder="Search number, student ID or title"
        columns={[
          { key: 'Certificate_Number', header: 'Number', type: 'mono', primary: true },
          { key: 'Student_ID', header: 'Student', type: 'mono' }, { key: 'Title', header: 'Achievement' },
          { key: 'Event_ID', header: 'Event', type: 'mono', hideOnMobile: true }, { key: 'Issue_Date', header: 'Issued', type: 'date' },
          { key: 'Status', header: 'Status', type: 'badge' },
        ]}
        fields={[{ name: 'Title', label: 'Achievement / title', full: true }, { name: 'Certificate_Type', label: 'Certificate type' }, { name: 'Position', label: 'Position', type: 'number' },
          { name: 'Issue_Date', label: 'Issue date', type: 'date' }, { name: 'Expiry_Date', label: 'Expiry date', type: 'date' }]}
        rowActions={(r: Row) => (
          <>
            {s(r.Certificate_URL) && <a href={s(r.Certificate_URL)} target="_blank" rel="noopener noreferrer" className="grid size-9 place-items-center rounded-full hover:bg-surface" title="Open PDF" aria-label="Open PDF"><ExternalLink className="size-4" /></a>}
            {s(r.Status) === 'DRAFT' && <button type="button" onClick={() => act('publishCertificate', s(r.Student_Certification_ID), 'Certificate published')} className="grid size-9 place-items-center rounded-full hover:bg-surface" title="Publish" aria-label="Publish"><Send className="size-4" /></button>}
            <button type="button" onClick={() => act('regenerateCertificate', s(r.Student_Certification_ID), 'PDF regenerated')} className="grid size-9 place-items-center rounded-full hover:bg-surface" title="Regenerate PDF" aria-label="Regenerate PDF"><RotateCw className="size-4" /></button>
            {s(r.Status) !== 'REVOKED' && <button type="button" onClick={() => { if (confirm('Revoke this certificate? Verification will show REVOKED.')) void act('revokeCertificate', s(r.Student_Certification_ID), 'Certificate revoked'); }} className="grid size-9 place-items-center rounded-full text-red-600 hover:bg-red-50" title="Revoke" aria-label="Revoke"><Ban className="size-4" /></button>}
          </>
        )} />
      <Modal open={open} onClose={() => setOpen(false)} title="Create certificate" size="lg"
        footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form="cert-form" loading={busy}>Create</Button></>}>
        <form id="cert-form" onSubmit={create} className="grid gap-4 sm:grid-cols-2">
          <Field label="Student" htmlFor="cs" required className="sm:col-span-2"><StudentPicker id="cs" value={f.studentId} onChange={(v) => setF({ ...f, studentId: v })} /></Field>
          <Field label="Event (optional)" htmlFor="ce"><EventSelect id="ce" value={f.eventId} onChange={(v) => setF({ ...f, eventId: v })} /></Field>
          <Field label="Certification program (optional)" htmlFor="cc"><Select id="cc" value={f.certificationId} onChange={(e) => setF({ ...f, certificationId: e.target.value })}>
            <option value="">None</option>{(certs.data || []).map((c) => <option key={s(c.Certification_ID)} value={s(c.Certification_ID)}>{s(c.Certification_Name)}</option>)}</Select></Field>
          <Field label="Certificate type" htmlFor="ct"><Input id="ct" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} /></Field>
          <Field label="Position" htmlFor="cp"><Input id="cp" type="number" min={0} value={f.position} onChange={(e) => setF({ ...f, position: e.target.value })} /></Field>
          <Field label="Achievement / title" htmlFor="ctl" className="sm:col-span-2"><Input id="ctl" value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Gold — 500m Rink, Under 14" /></Field>
          <Field label="Issue date" htmlFor="ci"><Input id="ci" type="date" value={f.issueDate} onChange={(e) => setF({ ...f, issueDate: e.target.value })} /></Field>
          <Field label="Expiry date (optional)" htmlFor="cx"><Input id="cx" type="date" value={f.expiryDate} onChange={(e) => setF({ ...f, expiryDate: e.target.value })} /></Field>
          <Field label="Status" htmlFor="cst"><Select id="cst" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}><option value="ISSUED">Issued (notify student)</option><option value="DRAFT">Draft</option></Select></Field>
          <div className="flex items-end"><Checkbox checked={f.generatePdf} onChange={(e) => setF({ ...f, generatePdf: e.target.checked })} label="Generate PDF in Google Drive" /></div>
          <div className="sm:col-span-2"><FormError message={err} /></div>
        </form>
      </Modal>
    </>
  );
}
