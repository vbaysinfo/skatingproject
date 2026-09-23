'use client';
import { PortalHeader } from '@/components/portal/PortalShell';
import { EntityManager } from '@/components/admin/EntityManager';

const TYPES = ['MEDAL', 'CHAMPIONSHIP', 'SPECIAL_AWARD', 'RECORD', 'CERTIFICATE', 'OTHER'];

export default function AdminAchievementsPage() {
  return (
    <>
      <PortalHeader title="Achievements" subtitle="Medals are added automatically when results are published. Add championships, records and special awards here." />
      <EntityManager entity="achievements" noun="Achievement" statuses={['ACTIVE', 'HIDDEN', 'ARCHIVED']} filters={[{ name: 'Achievement_Type', label: 'Type', options: TYPES }]}
        defaults={{ Status: 'ACTIVE' }}
        columns={[
          { key: 'Title', header: 'Title', primary: true }, { key: 'Student_ID', header: 'Student', type: 'mono' },
          { key: 'Achievement_Type', header: 'Type', type: 'label' }, { key: 'Date', header: 'Date', type: 'date' },
          { key: 'Status', header: 'Status', type: 'badge' },
        ]}
        fields={[
          { name: 'Student_ID', label: 'Student', type: 'student', required: true, full: true },
          { name: 'Achievement_Type', label: 'Type', type: 'select', options: TYPES, required: true },
          { name: 'Event_ID', label: 'Event', type: 'event' },
          { name: 'Title', label: 'Title', required: true, full: true },
          { name: 'Position', label: 'Position' }, { name: 'Date', label: 'Date', type: 'date' },
          { name: 'Description', label: 'Description', type: 'textarea' },
          { name: 'Image_URL', label: 'Image', type: 'image', full: true },
          { name: 'Status', label: 'Status', type: 'select', options: ['ACTIVE', 'HIDDEN'] },
        ]} />
    </>
  );
}
