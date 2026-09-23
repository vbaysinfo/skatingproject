import { Badge, type Tone } from '@/components/ui/Badge';
import type { EventSummary } from '@/lib/types';

const TYPE_TONE: Record<string, Tone> = {
  NATIONAL: 'violet', STATE: 'brand', DISTRICT: 'green', OPEN: 'accent', SCHOOL: 'amber', ACADEMY: 'slate', CHAMPIONSHIP: 'red', TRAINING: 'green', OTHER: 'slate',
};

export function TypeBadge({ type, className }: { type: string; className?: string }) {
  return <Badge tone={TYPE_TONE[type] || 'slate'} className={className}>{type}</Badge>;
}

export function LifecycleBadge({ event }: { event: Pick<EventSummary, 'lifecycle'> }) {
  if (event.lifecycle === 'CANCELLED') return <Badge tone="red">Cancelled</Badge>;
  if (event.lifecycle === 'ONGOING') return <Badge tone="green"><span className="size-1.5 animate-pulse rounded-full bg-emerald-500" aria-hidden />Ongoing</Badge>;
  if (event.lifecycle === 'PAST') return <Badge tone="slate">Completed</Badge>;
  return <Badge tone="brand">Upcoming</Badge>;
}

export function registrationLabel(e: Pick<EventSummary, 'registrationState' | 'registrationStart' | 'lifecycle'>): string {
  switch (e.registrationState) {
    case 'OPEN': return 'Register';
    case 'FULL': return 'Registration Full';
    case 'NOT_OPEN': return 'Opens Soon';
    case 'CANCELLED': return 'Cancelled';
    default: return 'Registration Closed';
  }
}
