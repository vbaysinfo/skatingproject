'use client';
import { Medal, Trophy, Star, Award } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDate, labelize } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card } from '@/components/ui/Card';
import { ErrorState, EmptyState, CardSkeletonGrid } from '@/components/ui/States';

const ICON: Record<string, typeof Medal> = { MEDAL: Medal, CHAMPIONSHIP: Trophy, RECORD: Star, AWARD: Award };

export default function MyAchievementsPage() {
  const { data, error, loading } = useApi(() => api.getStudentAchievements(), []);
  if (error) return <ErrorState message={error.message} />;
  return (
    <>
      <PortalHeader title="My achievements" subtitle="Medals, championships, records and special awards." />
      {loading ? <CardSkeletonGrid count={3} /> : !data?.length ? <EmptyState title="No achievements yet" message="Podium finishes and awards are added here automatically." icon={<Medal className="size-6" />} /> : (
        <div className="grid gap-5 sm:grid-cols-2 2xl:grid-cols-3">
          {data.map((a) => {
            const Icon = ICON[a.type] || Award;
            const gold = /gold/i.test(a.title), silver = /silver/i.test(a.title);
            return (
              <Card key={a.id} className="flex gap-4 p-5">
                {a.imageUrl ? <img src={a.imageUrl} alt="" className="size-16 shrink-0 rounded-2xl object-cover" /> :
                  <span className={`grid size-16 shrink-0 place-items-center rounded-2xl ${gold ? 'bg-amber-100 text-amber-600' : silver ? 'bg-slate-100 text-slate-500' : 'bg-orange-50 text-orange-600'}`}><Icon className="size-8" aria-hidden /></span>}
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-accent-600">{labelize(a.type)}</p>
                  <p className="font-display text-xl font-bold uppercase leading-tight">{a.title}</p>
                  <p className="mt-1 text-sm text-muted">{[a.eventName, formatDate(a.date)].filter(Boolean).join(' · ')}</p>
                  {a.description && a.description !== a.eventName && <p className="mt-1 text-sm text-ink-soft">{a.description}</p>}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
