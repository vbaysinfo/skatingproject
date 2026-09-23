'use client';
import { useState } from 'react';
import { FileText, Download, FileUp } from 'lucide-react';
import { api, ApiError, downloadBase64 } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { DOCUMENT_TYPES, toFilePayload } from '@/lib/files';
import { formatTimestamp, labelize } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card, CardHeader } from '@/components/ui/Card';
import { ErrorState, EmptyState, LoadingState } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Form';
import { useToast } from '@/components/ui/Toast';
import { useSettings } from '@/components/portal/SettingsContext';

const TYPES = ['BIRTH_CERTIFICATE', 'STUDENT_ID', 'PHOTO', 'MEDICAL_CONSENT', 'ADDRESS_PROOF', 'OTHER'];

export default function DocumentsPage() {
  const toast = useToast();
  const settings = useSettings();
  const { data, error, loading, reload } = useApi(() => api.getMyDocuments(), []);
  const [type, setType] = useState('BIRTH_CERTIFICATE');
  const [uploading, setUploading] = useState(false);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setUploading(true);
    try {
      await api.uploadDocument(type, await toFilePayload(f, { allowed: DOCUMENT_TYPES }));
      toast('Document uploaded');
      await reload();
    } catch (err) {
      toast(err instanceof ApiError || err instanceof Error ? err.message : 'Upload failed', 'error');
    } finally {
      setUploading(false);
    }
  }
  async function download(id: string) {
    try { const d = await api.downloadDocument(id); downloadBase64(d.fileName, d.base64, d.mimeType); }
    catch (err) { toast(err instanceof ApiError ? err.message : 'Download failed', 'error'); }
  }
  if (error) return <ErrorState message={error.message} />;
  return (
    <>
      <PortalHeader title="Documents" subtitle="Private documents stored in your folder in the association’s Google Drive. Only you and administrators can access them." />
      <Card className="mb-6">
        <CardHeader title="Upload a document" />
        <div className="flex flex-wrap items-center gap-3 p-5">
          <Select aria-label="Document type" value={type} onChange={(e) => setType(e.target.value)} className="w-56">{TYPES.map((t) => <option key={t} value={t}>{labelize(t)}</option>)}</Select>
          <label className={`inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-brand-600 px-5 text-sm font-semibold text-white hover:bg-brand-700 ${uploading ? 'pointer-events-none opacity-60' : ''}`}>
            <FileUp className="size-4" />{uploading ? 'Uploading…' : 'Choose file'}
            <input type="file" accept={DOCUMENT_TYPES.join(',')} className="sr-only" onChange={upload} disabled={uploading} />
          </label>
          <p className="text-xs text-muted">PDF, JPG, PNG or WEBP · max 8 MB</p>
        </div>
      </Card>
      {loading ? <LoadingState /> : !data?.length ? <EmptyState title="No documents uploaded" /> : (
        <Card>
          <ul className="divide-y divide-line">
            {data.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <FileText className="size-8 text-brand-500" aria-hidden />
                <div className="min-w-0 flex-1"><p className="font-semibold">{labelize(d.type)}</p><p className="truncate text-xs text-muted">{d.fileName} · {formatTimestamp(d.createdAt, settings.TIMEZONE)}</p></div>
                <StatusBadge status={d.status} />
                <button type="button" onClick={() => download(d.id)} className="grid size-10 place-items-center rounded-full ring-1 ring-line hover:ring-brand-300" aria-label={'Download ' + d.fileName}><Download className="size-4" /></button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
