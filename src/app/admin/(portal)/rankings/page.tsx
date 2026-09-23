'use client';
import { PortalHeader } from '@/components/portal/PortalShell';
import { EntityManager } from '@/components/admin/EntityManager';

export default function AdminRankingRulesPage() {
  return (
    <>
      <PortalHeader title="Ranking rules" subtitle="Points per finishing position. Leave Category / Year empty for a default rule — the most specific rule wins. Points are applied when results are saved." />
      <EntityManager entity="rankingRules" noun="Rule" hardDelete statuses={['ACTIVE', 'INACTIVE']} defaults={{ Status: 'ACTIVE' }} pageSize={50}
        columns={[
          { key: 'Position', header: 'Position', primary: true }, { key: 'Points', header: 'Points' },
          { key: 'Category', header: 'Category / race', render: (r) => String(r.Category || 'All') }, { key: 'Year', header: 'Year', render: (r) => String(r.Year || 'All') },
          { key: 'Status', header: 'Status', type: 'badge' },
        ]}
        fields={[
          { name: 'Position', label: 'Position', type: 'number', required: true }, { name: 'Points', label: 'Points', type: 'number', required: true },
          { name: 'Category', label: 'Category or race (optional)', placeholder: 'e.g. 500M Rink' }, { name: 'Year', label: 'Year (optional)' },
          { name: 'Status', label: 'Status', type: 'select', options: ['ACTIVE', 'INACTIVE'] },
        ]} />
    </>
  );
}
