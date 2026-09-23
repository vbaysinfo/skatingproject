'use client';
import { useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { cn, formatTimestamp, labelize } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { ErrorState, EmptyState, LoadingState } from '@/components/ui/States';
import { Button } from '@/components/ui/Button';
import { PagerButtons } from '@/components/ui/Pagination';
import { useSettings } from '@/components/portal/SettingsContext';

export default function NotificationsPage() {
  const settings = useSettings();
  const [page, setPage] = useState(1);
  const { data, error, loading, reload, setData } = useApi(() => api.getNotifications(page), [page]);
  async function read(id?: string) {
    await api.markNotificationRead(id).catch(() => undefined);
    if (id && data) setData({ ...data, items: data.items.map((n) => (n.id === id ? { ...n, read: true } : n)) });
    else await reload();
  }
  if (error) return <ErrorState message={error.message} />;
  return (
    <>
      <PortalHeader title="Notifications" action={<Button variant="secondary" onClick={() => read()} icon={<CheckCheck className="size-4" />}>Mark all as read</Button>} />
      {loading ? <LoadingState /> : !data?.items.length ? <EmptyState title="You're all caught up" icon={<Bell className="size-6" />} /> : (
        <Card>
          <ul className="divide-y divide-line">
            {data.items.map((n) => (
              <li key={n.id} className={cn('flex gap-4 px-5 py-4', !n.read && 'bg-brand-50/50')}>
                <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', n.read ? 'bg-line' : 'bg-accent-500')} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{n.title}{!n.read && <span className="sr-only"> (unread)</span>}</p>
                  <p className="mt-0.5 text-sm text-ink-soft">{n.message}</p>
                  <p className="mt-1 text-xs text-muted">{labelize(n.type)} · {formatTimestamp(n.createdAt, settings.TIMEZONE)}</p>
                </div>
                {!n.read && <button type="button" onClick={() => read(n.id)} className="self-start text-xs font-bold text-brand-700 hover:underline">Mark read</button>}
              </li>
            ))}
          </ul>
          <PagerButtons className="border-t border-line py-4" page={data.page} totalPages={data.totalPages} onPage={setPage} />
        </Card>
      )}
    </>
  );
}
