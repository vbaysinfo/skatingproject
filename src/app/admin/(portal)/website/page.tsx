'use client';
import { useEffect, useState } from 'react';
import { Save, ExternalLink } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import type { Row } from '@/lib/types';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Checkbox, Field, Input, Textarea } from '@/components/ui/Form';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { ImageInput } from '@/components/admin/Inputs';

type Section = { title: string; subtitle?: string; fields: { key: string; label: string; type?: 'text' | 'textarea' | 'image' | 'bool' | 'url'; help?: string }[] };
const SECTIONS: Section[] = [
  { title: 'Identity', fields: [{ key: 'SITE_NAME', label: 'Association name' }, { key: 'SITE_SHORT_NAME', label: 'Short name' }, { key: 'SITE_TAGLINE', label: 'Tagline' },
    { key: 'SITE_LOGO', label: 'Logo', type: 'image', help: 'Changes the header, footer, cards and certificates' }] },
  { title: 'Hero', subtitle: 'Homepage banner', fields: [{ key: 'HERO_TITLE', label: 'Heading (one line per row)', type: 'textarea' }, { key: 'HERO_SUBTITLE', label: 'Subtitle', type: 'textarea' },
    { key: 'HERO_IMAGE', label: 'Background image', type: 'image' }, { key: 'HERO_VIDEO', label: 'Background video URL (optional MP4)', type: 'url' }] },
  { title: 'About', fields: [{ key: 'ABOUT_INTRO', label: 'Introduction (homepage)', type: 'textarea' }, { key: 'ABOUT_FULL', label: 'Full about text', type: 'textarea' },
    { key: 'VISION', label: 'Vision', type: 'textarea' }, { key: 'MISSION', label: 'Mission', type: 'textarea' }, { key: 'ABOUT_IMAGE', label: 'About image', type: 'image' }] },
  { title: 'Statistics', fields: [{ key: 'SHOW_STATISTICS', label: 'Show the live statistics band on the homepage (values are always calculated automatically)', type: 'bool' }] },
  { title: 'Contact information', fields: [{ key: 'SITE_EMAIL', label: 'Email' }, { key: 'SITE_PHONE', label: 'Phone' }, { key: 'SITE_ADDRESS', label: 'Address', type: 'textarea' },
    { key: 'OFFICE_HOURS', label: 'Office hours' }, { key: 'GOOGLE_MAP_URL', label: 'Google Maps embed URL', type: 'url', help: 'Google Maps → Share → Embed a map → copy the src URL' }] },
  { title: 'Social links', fields: [{ key: 'INSTAGRAM_URL', label: 'Instagram', type: 'url' }, { key: 'FACEBOOK_URL', label: 'Facebook', type: 'url' }, { key: 'YOUTUBE_URL', label: 'YouTube', type: 'url' },
    { key: 'WHATSAPP_URL', label: 'WhatsApp', type: 'url' }, { key: 'X_URL', label: 'X / Twitter', type: 'url' }] },
  { title: 'Legal pages', fields: [{ key: 'PRIVACY_POLICY', label: 'Privacy policy', type: 'textarea' }, { key: 'TERMS_CONDITIONS', label: 'Terms & conditions', type: 'textarea' }] },
];

export default function AdminWebsitePage() {
  const toast = useToast();
  const { data, error, loading } = useApi(() => api.admin.call<{ settings: Row[] }>('getSettings'), []);
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!data) return;
    const v: Record<string, string> = {};
    data.settings.forEach((r) => { v[String(r.Setting_Key)] = String(r.Setting_Value ?? ''); });
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValues(v);
  }, [data]);
  const set = (k: string, v: string) => { setValues((x) => ({ ...x, [k]: v })); setDirty((d) => new Set(d).add(k)); };
  async function save() {
    setBusy(true);
    try {
      const out: Record<string, string> = {};
      dirty.forEach((k) => { out[k] = values[k] ?? ''; });
      await api.admin.call('updateSettings', { settings: out });
      setDirty(new Set());
      toast('Website updated — changes are live');
    } catch (e) { toast(e instanceof ApiError ? e.message : 'Save failed', 'error'); } finally { setBusy(false); }
  }
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error.message} />;
  return (
    <>
      <PortalHeader title="Website content" subtitle="Everything here is stored in the Settings sheet — no code changes needed."
        action={<><ButtonLink href="/" target="_blank" variant="secondary" icon={<ExternalLink className="size-4" />}>View site</ButtonLink><Button onClick={save} loading={busy} disabled={!dirty.size} icon={<Save className="size-4" />}>Save {dirty.size ? `(${dirty.size})` : ''}</Button></>} />
      <div className="space-y-6">
        {SECTIONS.map((sec) => (
          <Card key={sec.title}>
            <CardHeader title={sec.title} subtitle={sec.subtitle} />
            <div className="grid gap-4 p-5 md:grid-cols-2">
              {sec.fields.map((f) => {
                const id = 'w-' + f.key;
                const v = values[f.key] ?? '';
                if (f.type === 'bool') return <Checkbox key={f.key} className="md:col-span-2" checked={v.toUpperCase() !== 'FALSE'} onChange={(e) => set(f.key, e.target.checked ? 'TRUE' : 'FALSE')} label={f.label} />;
                return (
                  <Field key={f.key} label={f.label} htmlFor={id} hint={f.help} className={f.type === 'textarea' ? 'md:col-span-2' : ''}>
                    {f.type === 'textarea' ? <Textarea id={id} value={v} onChange={(e) => set(f.key, e.target.value)} rows={f.key.includes('POLICY') || f.key.includes('TERMS') ? 8 : 3} />
                      : f.type === 'image' ? <ImageInput id={id} value={v} onChange={(x) => set(f.key, x)} />
                      : <Input id={id} type={f.type === 'url' ? 'url' : 'text'} value={v} onChange={(e) => set(f.key, e.target.value)} />}
                  </Field>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
      <div className="sticky bottom-4 mt-6 flex justify-end"><Button size="lg" onClick={save} loading={busy} disabled={!dirty.size} icon={<Save className="size-4" />}>Save changes</Button></div>
    </>
  );
}
