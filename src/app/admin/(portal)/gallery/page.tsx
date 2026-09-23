'use client';
import { useState } from 'react';
import { Upload, Link2 } from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { IMAGE_TYPES, toFilePayload } from '@/lib/files';
import { labelize } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { EntityManager } from '@/components/admin/EntityManager';
import { EventSelect } from '@/components/admin/Inputs';
import { Card, CardHeader } from '@/components/ui/Card';
import { ButtonTabs } from '@/components/ui/Tabs';
import { Button } from '@/components/ui/Button';
import { Checkbox, Field, Input, Select } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';

const CATS = ['EVENTS', 'TRAINING', 'CHAMPIONSHIPS', 'AWARDS', 'STUDENTS', 'COACHES', 'ASSOCIATION', 'OTHER'];
const VCATS = ['TRAINING', 'EVENTS', 'CHAMPIONSHIPS', 'HIGHLIGHTS', 'INTERVIEWS'];

function Uploader({ onDone }: { onDone: () => void }) {
  const toast = useToast();
  const [category, setCategory] = useState('EVENTS');
  const [eventId, setEventId] = useState('');
  const [featured, setFeatured] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [driveUrl, setDriveUrl] = useState('');
  const [title, setTitle] = useState('');

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    let ok = 0;
    for (let i = 0; i < files.length; i++) {
      setProgress(`Uploading ${i + 1} of ${files.length}…`);
      try {
        const file = await toFilePayload(files[i]!, { allowed: IMAGE_TYPES, maxSide: 2000 });
        await api.admin.upload('gallery', file, { category, eventId, featured, title: files.length === 1 ? title : '' });
        ok++;
      } catch (err) {
        toast(`${files[i]!.name}: ${err instanceof ApiError || err instanceof Error ? err.message : 'failed'}`, 'error');
      }
    }
    setProgress(null);
    if (ok) { toast(`${ok} image${ok > 1 ? 's' : ''} published to the gallery`); onDone(); }
  }
  async function addDrive() {
    try {
      await api.admin.save('gallery', { Title: title || 'Photo', Category: category, Event_ID: eventId, Image_URL: driveUrl, Featured: featured ? 'TRUE' : 'FALSE', Status: 'PUBLISHED' });
      setDriveUrl(''); setTitle('');
      toast('Drive image added'); onDone();
    } catch (err) { toast(err instanceof ApiError ? err.message : 'Could not add', 'error'); }
  }
  return (
    <Card className="mb-6">
      <CardHeader title="Add images" subtitle="Images are stored in Google Drive (Gallery/{category} or the event's Gallery folder), made viewable, and appear on the website immediately." />
      <div className="grid gap-4 p-5 md:grid-cols-4">
        <Field label="Category" htmlFor="gc"><Select id="gc" value={category} onChange={(e) => setCategory(e.target.value)}>{CATS.map((c) => <option key={c} value={c}>{labelize(c)}</option>)}</Select></Field>
        <Field label="Event (optional)" htmlFor="ge"><EventSelect id="ge" value={eventId} onChange={setEventId} /></Field>
        <Field label="Title (single upload / Drive link)" htmlFor="gt"><Input id="gt" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
        <div className="flex items-end"><Checkbox checked={featured} onChange={(e) => setFeatured(e.target.checked)} label="Feature on homepage" /></div>
        <div className="md:col-span-2">
          <label className={`flex h-24 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 text-sm font-semibold text-brand-700 hover:border-brand-400 ${progress ? 'pointer-events-none opacity-60' : ''}`}>
            <Upload className="size-5" />{progress || 'Upload JPG / PNG / WEBP (multiple allowed)'}
            <input type="file" multiple accept={IMAGE_TYPES.join(',')} className="sr-only" onChange={upload} />
          </label>
        </div>
        <div className="md:col-span-2">
          <Field label="…or add an existing Google Drive file (link or file ID)" htmlFor="gd">
            <div className="flex gap-2"><Input id="gd" value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} placeholder="https://drive.google.com/file/d/…" />
              <Button variant="secondary" onClick={addDrive} disabled={!driveUrl} icon={<Link2 className="size-4" />}>Add</Button></div>
          </Field>
        </div>
      </div>
    </Card>
  );
}

export default function AdminGalleryPage() {
  const [tab, setTab] = useState('photos');
  const [key, setKey] = useState(0);
  return (
    <>
      <PortalHeader title="Gallery" subtitle="Photos and videos for the public gallery." />
      <ButtonTabs className="mb-5" active={tab} onChange={setTab} tabs={[{ key: 'photos', label: 'Photos' }, { key: 'videos', label: 'Videos' }]} />
      {tab === 'photos' ? (
        <>
          <Uploader onDone={() => setKey((k) => k + 1)} />
          <EntityManager key={key} entity="gallery" noun="Image" hardDelete canCreate={false} statuses={['PUBLISHED', 'UNPUBLISHED', 'ARCHIVED']} filters={[{ name: 'Category', label: 'Category', options: CATS }]}
            columns={[
              { key: 'Image_URL', header: '', type: 'image' }, { key: 'Title', header: 'Title', primary: true },
              { key: 'Category', header: 'Category', type: 'label' }, { key: 'Event_ID', header: 'Event', type: 'mono', hideOnMobile: true },
              { key: 'Featured', header: 'Featured', type: 'bool' }, { key: 'Status', header: 'Status', type: 'badge' },
            ]}
            fields={[
              { name: 'Title', label: 'Title', required: true, full: true },
              { name: 'Category', label: 'Category', type: 'select', options: CATS, required: true },
              { name: 'Status', label: 'Status', type: 'select', options: ['PUBLISHED', 'UNPUBLISHED'] },
              { name: 'Event_ID', label: 'Event', type: 'event' }, { name: 'Display_Order', label: 'Display order', type: 'number' },
              { name: 'Description', label: 'Description', type: 'textarea' },
              { name: 'Image_URL', label: 'Image', type: 'image', full: true },
              { name: 'Featured', label: 'Featured', type: 'bool', help: 'Feature on the homepage' },
            ]} />
        </>
      ) : (
        <EntityManager entity="videos" noun="Video" hardDelete statuses={['PUBLISHED', 'UNPUBLISHED', 'ARCHIVED']} defaults={{ Status: 'PUBLISHED', Category: 'HIGHLIGHTS', Display_Order: 100 }}
          columns={[{ key: 'Title', header: 'Title', primary: true }, { key: 'Category', header: 'Category', type: 'label' }, { key: 'Video_URL', header: 'URL', hideOnMobile: true, render: (r) => <span className="line-clamp-1 max-w-xs text-xs text-muted">{String(r.Video_URL)}</span> },
            { key: 'Featured', header: 'Featured', type: 'bool' }, { key: 'Status', header: 'Status', type: 'badge' }]}
          fields={[
            { name: 'Title', label: 'Title', required: true, full: true },
            { name: 'Video_URL', label: 'YouTube or Google Drive URL', type: 'url', required: true, full: true },
            { name: 'Category', label: 'Category', type: 'select', options: VCATS }, { name: 'Status', label: 'Status', type: 'select', options: ['PUBLISHED', 'UNPUBLISHED'] },
            { name: 'Event_ID', label: 'Event', type: 'event' }, { name: 'Display_Order', label: 'Display order', type: 'number' },
            { name: 'Thumbnail_URL', label: 'Thumbnail (optional)', type: 'image', full: true },
            { name: 'Description', label: 'Description', type: 'textarea' },
            { name: 'Featured', label: 'Featured', type: 'bool', help: 'Show on the homepage' },
          ]} />
      )}
    </>
  );
}
