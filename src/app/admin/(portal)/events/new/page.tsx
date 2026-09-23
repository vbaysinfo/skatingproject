'use client';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import type { Row } from '@/lib/types';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/components/ui/Toast';
import { loadEvents } from '@/components/admin/Inputs';
import { EventForm } from '../EventForm';

export default function NewEventPage() {
  const router = useRouter();
  const toast = useToast();
  return (
    <>
      <PortalHeader title="Create event" subtitle="A Drive folder (Poster, Rules, Schedule, Results, Gallery) is created automatically. Upload the poster after saving." />
      <Card className="p-6 sm:p-8">
        <EventForm submitLabel="Create event" onSubmit={async (data) => {
          try {
            const ev = await api.admin.call<Row>('createEvent', { data });
            toast('Event created');
            void loadEvents(true);
            router.push(`/admin/events/${String(ev.Event_ID)}?tab=media`);
          } catch (e) { throw new Error(e instanceof ApiError ? e.message : 'Could not create event'); }
        }} />
      </Card>
    </>
  );
}
