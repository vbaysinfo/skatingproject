'use client';
import { formatDate } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { EntityManager } from '@/components/admin/EntityManager';

export default function AdminInquiriesPage() {
  return (
    <>
      <PortalHeader title="Contact inquiries" subtitle="Messages from the website contact form." />
      <EntityManager entity="inquiries" noun="Inquiry" canCreate={false} canDelete={false} statuses={['NEW', 'CONTACTED', 'IN_PROGRESS', 'RESOLVED']}
        searchPlaceholder="Search name, email, mobile or subject"
        columns={[
          { key: 'Date', header: 'Date', render: (r) => formatDate(String(r.Date || r.Created_At || '')) },
          { key: 'Name', header: 'From', primary: true, render: (r) => <div><p className="font-semibold">{String(r.Name)}</p><p className="text-xs text-muted">{String(r.Email)} {r.Mobile ? '· ' + String(r.Mobile) : ''}</p></div> },
          { key: 'Subject', header: 'Subject', render: (r) => <div className="max-w-md"><p className="font-medium">{String(r.Subject)}</p><p className="line-clamp-2 text-xs text-muted">{String(r.Message)}</p></div> },
          { key: 'Status', header: 'Status', type: 'badge' },
        ]}
        fields={[
          { name: 'Message', label: 'Message (read only)', type: 'textarea' },
          { name: 'Status', label: 'Status', type: 'select', options: ['NEW', 'CONTACTED', 'IN_PROGRESS', 'RESOLVED'], required: true },
          { name: 'Admin_Notes', label: 'Admin notes', type: 'textarea' },
        ]} />
    </>
  );
}
