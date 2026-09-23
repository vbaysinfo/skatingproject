'use client';
import { PortalHeader } from '@/components/portal/PortalShell';
import { EntityManager } from '@/components/admin/EntityManager';

export default function AdminSponsorsPage() {
  return (
    <>
      <PortalHeader title="Sponsors" subtitle="Displayed on the homepage and on event pages when linked to events." />
      <EntityManager entity="sponsors" noun="Sponsor" statuses={['ACTIVE', 'INACTIVE', 'ARCHIVED']} defaults={{ Status: 'ACTIVE', Display_Order: 100, Show_On_Home: 'TRUE' }}
        columns={[
          { key: 'Logo_URL', header: '', type: 'image', hideOnMobile: true },
          { key: 'Sponsor_Name', header: 'Sponsor', primary: true }, { key: 'Tier', header: 'Tier' },
          { key: 'Show_On_Home', header: 'Homepage', type: 'bool' }, { key: 'Display_Order', header: 'Order' },
          { key: 'Status', header: 'Status', type: 'badge' },
        ]}
        fields={[
          { name: 'Sponsor_Name', label: 'Name', required: true }, { name: 'Tier', label: 'Tier', placeholder: 'Title Partner' },
          { name: 'Logo_URL', label: 'Logo', type: 'image', full: true },
          { name: 'Website_URL', label: 'Website', type: 'url' }, { name: 'Display_Order', label: 'Display order', type: 'number' },
          { name: 'Event_IDs', label: 'Show on events (Event IDs, comma separated)', full: true },
          { name: 'Description', label: 'Description', type: 'textarea' },
          { name: 'Status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
          { name: 'Show_On_Home', label: 'Homepage', type: 'bool', help: 'Show on the homepage' },
        ]} />
    </>
  );
}
