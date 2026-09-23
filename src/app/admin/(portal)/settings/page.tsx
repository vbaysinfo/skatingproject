'use client';
import { useEffect, useState } from 'react';
import { Save, Trash2, RefreshCcw, UserPlus, KeyRound, Database, FolderOpen, Beaker } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import type { Row } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/Form';
import { StatusBadge } from '@/components/ui/Badge';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';

type SettingsData = { settings: Row[]; secrets: Record<string, string>; system: { spreadsheetId: string; spreadsheetUrl: string; driveRootFolderId: string; driveRootUrl: string; appVersion: string; timezone: string; triggers: string[] } };
type Admin = { userId: string; email: string; name: string; status: string; lastLogin: string; provider: string };

const GROUPS: { title: string; keys: { key: string; label: string; type?: 'bool' | 'select' | 'number' | 'textarea'; options?: string[]; help?: string }[] }[] = [
  { title: 'General', keys: [{ key: 'TIMEZONE', label: 'Timezone', help: 'Used for all date logic (event status, deadlines, expiry)' }, { key: 'DEFAULT_CURRENCY', label: 'Currency' }] },
  { title: 'Payments', keys: [{ key: 'PAYMENT_GATEWAY', label: 'Payment gateway', type: 'select', options: ['MANUAL', 'RAZORPAY', 'FREE'] },
    { key: 'PAYMENT_INSTRUCTIONS', label: 'Manual payment instructions', type: 'textarea' }, { key: 'REFUND_POLICY', label: 'Refund policy', type: 'textarea' },
    { key: 'PENDING_PAYMENT_EXPIRY_HOURS', label: 'Release unpaid registrations after (hours)', type: 'number' }] },
  { title: 'Registration', keys: [{ key: 'STUDENT_AUTO_APPROVE', label: 'Approve new student accounts automatically', type: 'bool' },
    { key: 'MEMBERSHIP_AUTO_APPROVE', label: 'Activate memberships automatically after successful payment', type: 'bool' },
    { key: 'AUTO_ACHIEVEMENTS', label: 'Create medal achievements when results are published', type: 'bool' }] },
  { title: 'Notifications', keys: [{ key: 'EMAIL_NOTIFICATIONS', label: 'Also send notifications by email', type: 'bool' }, { key: 'CERTIFICATE_SIGNATORY', label: 'Certificate signatory title' }] },
  { title: 'API & performance', keys: [{ key: 'CACHE_SECONDS', label: 'Public cache duration (seconds)', type: 'number' }, { key: 'EVENTS_PAGE_SIZE', label: 'Events per page', type: 'number' },
    { key: 'GALLERY_PAGE_SIZE', label: 'Gallery items per page', type: 'number' }, { key: 'ADMIN_PAGE_SIZE', label: 'Admin rows per page', type: 'number' },
    { key: 'CONTACT_RATE_LIMIT', label: 'Contact submissions per client per hour', type: 'number' }, { key: 'QR_API_URL', label: 'QR image service for PDFs' }] },
];
const SECRETS = [['SITE_URL', 'Website URL (for QR/verification links)'], ['GOOGLE_CLIENT_ID', 'Google Sign-In client ID'], ['RAZORPAY_KEY_ID', 'Razorpay key ID'],
  ['RAZORPAY_KEY_SECRET', 'Razorpay key secret'], ['RAZORPAY_WEBHOOK_SECRET', 'Razorpay webhook secret']];

export default function AdminSettingsPage() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi(() => api.admin.call<SettingsData>('getSettings'), []);
  const admins = useApi(() => api.admin.call<Admin[]>('listAdmins'), []);
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [secret, setSecret] = useState({ key: 'SITE_URL', value: '' });
  const [na, setNa] = useState({ email: '', name: '', password: '' });
  useEffect(() => {
    if (!data) return;
    const v: Record<string, string> = {};
    data.settings.forEach((r) => { v[String(r.Setting_Key)] = String(r.Setting_Value ?? ''); });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues(v);
  }, [data]);
  const set = (k: string, v: string) => { setValues((x) => ({ ...x, [k]: v })); setDirty((d) => new Set(d).add(k)); };
  const run = async (fn: () => Promise<unknown>, msg: string) => { try { await fn(); toast(msg); } catch (e) { toast(e instanceof ApiError ? e.message : 'Failed', 'error'); } };

  if (loading) return <LoadingState />;
  if (error || !data) return <ErrorState message={error?.message} />;
  return (
    <>
      <PortalHeader title="Settings" action={<Button disabled={!dirty.size} onClick={() => run(async () => { const o: Record<string, string> = {}; dirty.forEach((k) => { o[k] = values[k] ?? ''; }); await api.admin.call('updateSettings', { settings: o }); setDirty(new Set()); }, 'Settings saved')} icon={<Save className="size-4" />}>Save {dirty.size ? `(${dirty.size})` : ''}</Button>} />
      <div className="grid gap-6 xl:grid-cols-2">
        {GROUPS.map((g) => (
          <Card key={g.title}>
            <CardHeader title={g.title} />
            <div className="grid gap-4 p-5">
              {g.keys.map((k) => {
                const id = 's-' + k.key, v = values[k.key] ?? '';
                if (k.type === 'bool') return <Checkbox key={k.key} checked={v.toUpperCase() === 'TRUE'} onChange={(e) => set(k.key, e.target.checked ? 'TRUE' : 'FALSE')} label={k.label} />;
                return (
                  <Field key={k.key} label={k.label} htmlFor={id} hint={k.help}>
                    {k.type === 'select' ? <Select id={id} value={v} onChange={(e) => set(k.key, e.target.value)}>{k.options!.map((o) => <option key={o}>{o}</option>)}</Select>
                      : k.type === 'textarea' ? <Textarea id={id} value={v} onChange={(e) => set(k.key, e.target.value)} rows={3} />
                      : <Input id={id} type={k.type === 'number' ? 'number' : 'text'} value={v} onChange={(e) => set(k.key, e.target.value)} />}
                  </Field>
                );
              })}
            </div>
          </Card>
        ))}
        <Card>
          <CardHeader title="Keys & integrations" subtitle="Stored in Apps Script Script Properties — secrets are write-only and never displayed." />
          <div className="space-y-4 p-5">
            <ul className="space-y-1.5 text-sm">{SECRETS.map(([k, l]) => <li key={k} className="flex justify-between gap-3"><span className="text-muted">{l}</span><span className="truncate font-mono text-xs">{data.secrets[k] || <em className="text-amber-700">not set</em>}</span></li>)}</ul>
            <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto]">
              <Select aria-label="Key" value={secret.key} onChange={(e) => setSecret({ ...secret, key: e.target.value })}>{SECRETS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</Select>
              <Input aria-label="Value" type={secret.key.includes('SECRET') ? 'password' : 'text'} value={secret.value} onChange={(e) => setSecret({ ...secret, value: e.target.value })} placeholder="New value (empty clears)" />
              <Button variant="secondary" onClick={() => run(async () => { await api.admin.call('setSecret', secret); setSecret({ ...secret, value: '' }); await reload(); }, 'Saved')} icon={<KeyRound className="size-4" />}>Set</Button>
            </div>
            <p className="text-xs text-muted">Razorpay webhook URL: <span className="font-mono">{typeof window !== 'undefined' ? window.location.origin : ''}/api/payments/webhook</span> (events: payment.captured, payment.failed, order.paid)</p>
          </div>
        </Card>
        <Card>
          <CardHeader title="Administrators" />
          <ul className="divide-y divide-line">
            {(admins.data || []).map((a) => (
              <li key={a.userId} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div><p className="font-semibold">{a.name}</p><p className="text-xs text-muted">{a.email} · {a.provider} · last login {formatDate(a.lastLogin) || 'never'}</p></div>
                <div className="flex items-center gap-2"><StatusBadge status={a.status} />
                  <Button size="sm" variant="ghost" onClick={() => run(async () => { await api.admin.call('setAdminStatus', { userId: a.userId, status: a.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE' }); await admins.reload(); }, 'Updated')}>{a.status === 'ACTIVE' ? 'Disable' : 'Enable'}</Button></div>
              </li>
            ))}
          </ul>
          <form className="grid gap-3 border-t border-line p-5 sm:grid-cols-3" onSubmit={(e) => { e.preventDefault(); void run(async () => { await api.admin.call('createAdmin', na); setNa({ email: '', name: '', password: '' }); await admins.reload(); }, 'Administrator added'); }}>
            <Input aria-label="Email" type="email" required placeholder="Email" value={na.email} onChange={(e) => setNa({ ...na, email: e.target.value })} />
            <Input aria-label="Name" placeholder="Name" value={na.name} onChange={(e) => setNa({ ...na, name: e.target.value })} />
            <Input aria-label="Password" type="password" placeholder="Password (empty = Google only)" value={na.password} onChange={(e) => setNa({ ...na, password: e.target.value })} autoComplete="new-password" />
            <Button type="submit" variant="secondary" className="sm:col-span-3 sm:justify-self-start" icon={<UserPlus className="size-4" />}>Add administrator</Button>
          </form>
        </Card>
        <Card>
          <CardHeader title="System" />
          <div className="space-y-3 p-5 text-sm">
            <p className="flex items-center gap-2"><Database className="size-4 text-brand-600" />Spreadsheet: <a href={data.system.spreadsheetUrl} target="_blank" rel="noopener noreferrer" className="truncate font-mono text-xs text-brand-700 underline">{data.system.spreadsheetId}</a></p>
            <p className="flex items-center gap-2"><FolderOpen className="size-4 text-brand-600" />Drive root: {data.system.driveRootUrl ? <a href={data.system.driveRootUrl} target="_blank" rel="noopener noreferrer" className="truncate font-mono text-xs text-brand-700 underline">{data.system.driveRootFolderId}</a> : 'not set'}</p>
            <p>Timezone: <strong>{data.system.timezone}</strong> · Version {data.system.appVersion}</p>
            <p>Triggers: {data.system.triggers.length ? data.system.triggers.join(', ') : <em className="text-amber-700">none installed — run installTriggers()</em>}</p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button variant="secondary" onClick={() => run(() => api.admin.call('clearCache'), 'Website cache cleared')} icon={<RefreshCcw className="size-4" />}>Clear website cache</Button>
              <Button variant="secondary" onClick={() => { if (confirm('Create demo events, programs and plans?')) void run(() => api.admin.call('createSampleData'), 'Sample data created'); }} icon={<Beaker className="size-4" />}>Create sample data</Button>
              <Button variant="danger" onClick={() => { if (confirm('Delete all sample/demo records? Real data is not affected.')) void run(() => api.admin.call('deleteSampleData'), 'Sample data deleted'); }} icon={<Trash2 className="size-4" />}>Delete sample data</Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
