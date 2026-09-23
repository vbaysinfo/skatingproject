'use client';
import { PortalHeader } from '@/components/portal/PortalShell';
import { EntityManager } from '@/components/admin/EntityManager';

export default function AdminAnnouncementsPage() {
  return (
    <>
      <PortalHeader title="Announcements" subtitle="Shown on the homepage between the publish and expiry dates — expired announcements hide automatically." />
      <EntityManager entity="announcements" noun="Announcement" statuses={['DRAFT', 'PUBLISHED', 'ARCHIVED']} defaults={{ Status: 'PUBLISHED', Priority: 'NORMAL', Display_Order: 100 }}
        columns={[
          { key: 'Title', header: 'Title', primary: true },
          { key: 'Publish_Date', header: 'Publish', type: 'date' }, { key: 'Expiry_Date', header: 'Expires', type: 'date' },
          { key: 'Priority', header: 'Priority', type: 'label' }, { key: 'Status', header: 'Status', type: 'badge' },
        ]}
        fields={[
          { name: 'Title', label: 'Title', required: true, full: true },
          { name: 'Description', label: 'Description', type: 'textarea', required: true },
          { name: 'Publish_Date', label: 'Publish date', type: 'date' }, { name: 'Expiry_Date', label: 'Expiry date', type: 'date' },
          { name: 'Priority', label: 'Priority', type: 'select', options: ['URGENT', 'HIGH', 'NORMAL', 'LOW'] },
          { name: 'Status', label: 'Status', type: 'select', options: ['DRAFT', 'PUBLISHED'] },
          { name: 'Image_URL', label: 'Image', type: 'image', full: true },
          { name: 'Link_URL', label: 'Link (optional)', placeholder: '/events/… or https://…' },
          { name: 'Display_Order', label: 'Display order', type: 'number' },
        ]} />
    </>
  );
}
