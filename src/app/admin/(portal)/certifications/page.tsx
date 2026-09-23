'use client';
import { PortalHeader } from '@/components/portal/PortalShell';
import { EntityManager } from '@/components/admin/EntityManager';

const TYPES = ['STUDENT_SKILL', 'COACH', 'OFFICIAL_JUDGE', 'TRAINING', 'OTHER'];

export default function AdminCertificationsPage() {
  return (
    <>
      <PortalHeader title="Certification programs" subtitle="Student skill, coach, official/judge and training certifications shown on the Programs page." />
      <EntityManager entity="certifications" noun="Certification" statuses={['ACTIVE', 'INACTIVE', 'ARCHIVED']} defaults={{ Status: 'ACTIVE', Display_Order: 100 }}
        columns={[
          { key: 'Certification_ID', header: 'ID', type: 'mono', hideOnMobile: true },
          { key: 'Certification_Name', header: 'Name', primary: true },
          { key: 'Certification_Type', header: 'Type', type: 'label' },
          { key: 'Level', header: 'Level' }, { key: 'Fee', header: 'Fee', type: 'money' },
          { key: 'Status', header: 'Status', type: 'badge' },
        ]}
        fields={[
          { name: 'Certification_Name', label: 'Name', required: true, full: true },
          { name: 'Certification_Type', label: 'Type', type: 'select', options: TYPES, required: true },
          { name: 'Level', label: 'Level' }, { name: 'Eligibility', label: 'Eligibility' }, { name: 'Duration', label: 'Duration' },
          { name: 'Assessment', label: 'Assessment' }, { name: 'Fee', label: 'Fee', type: 'number' },
          { name: 'Certificate_Type', label: 'Certificate type' },
          { name: 'Status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
          { name: 'Display_Order', label: 'Display order', type: 'number' },
          { name: 'Description', label: 'Description', type: 'textarea' },
        ]} />
    </>
  );
}
