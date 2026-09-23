'use client';
import { PortalHeader } from '@/components/portal/PortalShell';
import { EntityManager } from '@/components/admin/EntityManager';

const TYPES = ['SKATING_TRAINING', 'COMPETITION_TRAINING', 'SCHOOL_PROGRAM', 'ACADEMY_PROGRAM', 'COACH_DEVELOPMENT', 'OFFICIAL_JUDGE_PROGRAM', 'CERTIFICATION_PROGRAM', 'OTHER'];

export default function AdminProgramsPage() {
  return (
    <>
      <PortalHeader title="Programs" subtitle="Create, publish, unpublish and archive programs. Published programs appear on the website automatically." />
      <EntityManager entity="programs" noun="Program" statuses={['DRAFT', 'PUBLISHED', 'UNPUBLISHED', 'ARCHIVED']} filters={[{ name: 'Program_Type', label: 'Type', options: TYPES }]}
        defaults={{ Status: 'DRAFT', Registration_Status: 'OPEN', Display_Order: 100 }}
        columns={[
          { key: 'Image_URL', header: '', type: 'image', hideOnMobile: true },
          { key: 'Program_Name', header: 'Program', primary: true },
          { key: 'Program_Type', header: 'Type', type: 'label' },
          { key: 'Fee', header: 'Fee', type: 'money' },
          { key: 'Registration_Status', header: 'Registration', type: 'badge' },
          { key: 'Status', header: 'Status', type: 'badge' },
        ]}
        fields={[
          { name: 'Program_Name', label: 'Program name', required: true, full: true },
          { name: 'Program_Type', label: 'Type', type: 'select', options: TYPES, required: true },
          { name: 'Status', label: 'Status', type: 'select', options: ['DRAFT', 'PUBLISHED', 'UNPUBLISHED'] },
          { name: 'Short_Description', label: 'Short description', type: 'textarea' },
          { name: 'Full_Description', label: 'Full description', type: 'textarea' },
          { name: 'Image_URL', label: 'Program image', type: 'image', full: true },
          { name: 'Duration', label: 'Duration' }, { name: 'Eligibility', label: 'Eligibility' },
          { name: 'Fee', label: 'Fee', type: 'number' }, { name: 'Location', label: 'Location' },
          { name: 'Certification', label: 'Certification' },
          { name: 'Registration_Status', label: 'Registration status', type: 'select', options: ['OPEN', 'CLOSED'] },
          { name: 'Display_Order', label: 'Display order', type: 'number' },
          { name: 'Featured', label: 'Featured', type: 'bool', help: 'Feature on the homepage' },
          { name: 'Schedule', label: 'Schedule', type: 'textarea' },
          { name: 'Slug', label: 'URL slug', help: 'Leave empty to generate from the name', full: true },
        ]} />
    </>
  );
}
