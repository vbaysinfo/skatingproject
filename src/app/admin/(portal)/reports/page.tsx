'use client';
import { useState } from 'react';
import { Download, FileSpreadsheet, Play } from 'lucide-react';
import { api, ApiError, downloadText, type Paged } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import type { Row } from '@/lib/types';
import { formatMoney, labelize } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Form';
import { PagerButtons } from '@/components/ui/Pagination';
import { EmptyState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { EventSelect } from '@/components/admin/Inputs';
import { BarList } from '@/components/charts/Charts';

const TYPES = [['students', 'Student report'], ['memberships', 'Membership report'], ['registrations', 'Event registration report'], ['payments', 'Payment report'],
  ['results', 'Results report'], ['certificates', 'Certificate report'], ['programs', 'Program report'], ['events', 'Events report'], ['inquiries', 'Contact inquiries']] as const;
const s = (v: unknown) => String(v ?? '');
type Report = Paged<Row> & { columns: string[]; summary: { total: number; byStatus: Record<string, number>; amount?: number } };

export default function AdminReportsPage() {
  const toast = useToast();
  const [f, setF] = useState({ type: 'registrations', from: '', to: '', eventId: '', status: '' });
  const [page, setPage] = useState(1);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const mem = useApi(() => api.admin.call<{ byStatus: Record<string, number>; byType: Record<string, number>; byMonth: Record<string, number>; byYear: Record<string, number>; expiringIn30Days: number }>('getMembershipReport'), []);

  async function run(p = 1) {
    setLoading(true); setPage(p);
    try { setReport(await api.admin.call<Report>('getReport', { ...f, page: p })); } catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); } finally { setLoading(false); }
  }
  async function exp(format: 'csv' | 'sheet') {
    try {
      const r = await api.admin.export({ ...f, format });
      if (r.content) downloadText(r.filename, r.content);
      else if (r.url) { window.open(r.url, '_blank'); toast('Google Sheet created in Drive / Reports (download as .xlsx from File → Download)', 'info'); }
    } catch (e) { toast(e instanceof ApiError ? e.message : 'Export failed', 'error'); }
  }
  return (
    <>
      <PortalHeader title="Reports" subtitle="Filter, preview and export any dataset as CSV or an Excel-compatible Google Sheet." />
      <Card className="mb-6 p-5">
        <div className="grid gap-4 md:grid-cols-5">
          <Field label="Report" htmlFor="rt"><Select id="rt" value={f.type} onChange={(e) => { setF({ ...f, type: e.target.value }); setReport(null); }}>{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select></Field>
          <Field label="From" htmlFor="rf"><Input id="rf" type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} /></Field>
          <Field label="To" htmlFor="rto"><Input id="rto" type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} /></Field>
          <Field label="Event" htmlFor="rev"><EventSelect id="rev" value={f.eventId} onChange={(v) => setF({ ...f, eventId: v })} /></Field>
          <Field label="Status" htmlFor="rs"><Input id="rs" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value.toUpperCase() })} placeholder="e.g. ACTIVE, PAID" /></Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => run(1)} loading={loading} icon={<Play className="size-4" />}>Run report</Button>
          <Button variant="secondary" onClick={() => exp('csv')} icon={<Download className="size-4" />}>Export CSV</Button>
          <Button variant="secondary" onClick={() => exp('sheet')} icon={<FileSpreadsheet className="size-4" />}>Export Google Sheet / Excel</Button>
        </div>
      </Card>
      {loading && !report ? <LoadingState /> : report ? (
        <>
          <div className="mb-4 grid gap-4 sm:grid-cols-3">
            <StatCard label="Rows" value={report.summary.total} />
            {report.summary.amount !== undefined && <StatCard label="Successful amount" value={formatMoney(report.summary.amount)} tone="green" />}
            <Card className="p-5"><p className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted">By status</p><BarList data={report.summary.byStatus} /></Card>
          </div>
          <Card>
            {report.items.length === 0 ? <div className="p-5"><EmptyState title="No rows match these filters" /></div> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead><tr className="border-b border-line bg-surface/70 font-bold uppercase tracking-wider text-muted">{report.columns.map((c) => <th key={c} className="whitespace-nowrap px-3 py-2.5">{labelize(c)}</th>)}</tr></thead>
                  <tbody>{report.items.map((r, i) => <tr key={i} className="border-b border-line/70">{report.columns.map((c) => <td key={c} className="max-w-56 truncate px-3 py-2">{s(r[c])}</td>)}</tr>)}</tbody>
                </table>
              </div>
            )}
            <div className="flex justify-end border-t border-line px-5 py-3"><PagerButtons page={page} totalPages={report.totalPages} onPage={(p) => run(p)} /></div>
          </Card>
        </>
      ) : <EmptyState title="Choose a report and run it" />}
      {mem.data && (
        <div className="mt-8">
          <h2 className="mb-4 font-display text-2xl font-bold uppercase">Membership report</h2>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card><CardHeader title="By status" /><div className="p-5"><BarList data={mem.data.byStatus} /></div></Card>
            <Card><CardHeader title="By membership type" /><div className="p-5"><BarList data={mem.data.byType} /></div></Card>
            <Card><CardHeader title="By month (12 mo)" /><div className="p-5"><BarList data={mem.data.byMonth} max={12} /></div></Card>
            <Card><CardHeader title="By year" subtitle={`${mem.data.expiringIn30Days} expiring in 30 days`} /><div className="p-5"><BarList data={mem.data.byYear} /></div></Card>
          </div>
        </div>
      )}
    </>
  );
}
