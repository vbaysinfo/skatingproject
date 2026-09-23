'use client';
import { useState } from 'react';
import { ButtonTabs } from '@/components/ui/Tabs';
import { PortalHeader } from '@/components/portal/PortalShell';
import { EntityManager } from '@/components/admin/EntityManager';

export default function AdminLogsPage() {
  const [tab, setTab] = useState('audit');
  return (
    <>
      <PortalHeader title="Logs" subtitle="Audit trail of admin actions and internal errors (users only ever see a friendly message)." />
      <ButtonTabs className="mb-5" active={tab} onChange={setTab} tabs={[{ key: 'audit', label: 'Audit logs' }, { key: 'errors', label: 'Error logs' }]} />
      {tab === 'audit' ? (
        <EntityManager key="audit" entity="auditLogs" noun="Log entry" readOnly canCreate={false} pageSize={50}
          columns={[
            { key: 'Timestamp', header: 'Time', render: (r) => String(r.Timestamp).slice(0, 19).replace('T', ' ') },
            { key: 'Action', header: 'Action', primary: true }, { key: 'Entity_Type', header: 'Entity' }, { key: 'Entity_ID', header: 'ID', type: 'mono' },
            { key: 'User_ID', header: 'User', type: 'mono' },
            { key: 'New_Value', header: 'Change', hideOnMobile: true, render: (r) => <span className="line-clamp-2 max-w-xs font-mono text-[11px] text-muted">{String(r.New_Value || r.Old_Value || '')}</span> },
          ]} />
      ) : (
        <EntityManager key="errors" entity="errorLogs" noun="Error" readOnly canCreate={false} pageSize={50}
          columns={[
            { key: 'Timestamp', header: 'Time', render: (r) => String(r.Timestamp).slice(0, 19).replace('T', ' ') },
            { key: 'Action', header: 'Action', primary: true }, { key: 'Code', header: 'Code' },
            { key: 'Message', header: 'Message', render: (r) => <span className="line-clamp-2 max-w-md text-xs">{String(r.Message)}</span> },
          ]} />
      )}
    </>
  );
}
