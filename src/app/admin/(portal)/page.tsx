'use client';
import Link from 'next/link';
import { Users, IdCard, CalendarDays, Activity, History, ClipboardList, GraduationCap, Award, Wallet, Images, Inbox, Hourglass } from 'lucide-react';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';
import { formatDate, formatMoney, formatNumber } from '@/lib/format';
import { PortalHeader } from '@/components/portal/PortalShell';
import { Card, CardHeader, StatCard } from '@/components/ui/Card';
import { ErrorState, Skeleton } from '@/components/ui/States';
import { StatusBadge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { ColumnChart, BarList, monthLabel } from '@/components/charts/Charts';

type Dash = {
  counts: Record<string, number>;
  charts: { months: string[]; registrations: number[]; memberships: number[]; events: number[]; revenue: number[]; certificates: number[]; students: number[];
    studentsByAge: Record<string, number>; studentsByGender: Record<string, number>; eventsByType: Record<string, number>; membershipsByType: Record<string, number> };
  recentRegistrations: { id: string; student: string; event: string; status: string; payment: string; date: string }[];
  currency: string;
};

export default function AdminDashboard() {
  const { data: d, error, loading } = useApi(() => api.admin.dashboard<Dash>(), []);
  if (error) return <ErrorState message={error.message} />;
  const c = d?.counts;
  const labels = d?.charts.months.map(monthLabel) || [];
  const tiles = c ? [
    { label: 'Total students', value: formatNumber(c.totalStudents), icon: Users, hint: `${c.pendingStudents} pending approval`, href: '/admin/students' },
    { label: 'Active members', value: formatNumber(c.activeMembers), icon: IdCard, hint: `${c.pendingMemberships} awaiting approval`, href: '/admin/memberships', tone: 'green' as const },
    { label: 'Upcoming events', value: c.upcomingEvents, icon: CalendarDays, hint: `${c.draftEvents} drafts`, href: '/admin/events' },
    { label: 'Ongoing events', value: c.ongoingEvents, icon: Activity, tone: 'accent' as const, href: '/admin/events' },
    { label: 'Past events', value: c.pastEvents, icon: History, tone: 'slate' as const, hint: `${c.cancelledEvents} cancelled` },
    { label: 'Event registrations', value: formatNumber(c.eventRegistrations), icon: ClipboardList, tone: 'violet' as const, href: '/admin/registrations' },
    { label: 'Programs', value: c.programs, icon: GraduationCap, href: '/admin/programs' },
    { label: 'Certificates', value: formatNumber(c.certificates), icon: Award, tone: 'green' as const, href: '/admin/certificates' },
    { label: 'Revenue', value: formatMoney(c.revenue, d!.currency), icon: Wallet, tone: 'accent' as const, hint: `${c.pendingPayments} pending payments`, href: '/admin/payments' },
    { label: 'Gallery items', value: c.galleryItems, icon: Images, tone: 'violet' as const, href: '/admin/gallery' },
    { label: 'Contact inquiries', value: c.contactInquiries, icon: Inbox, tone: 'slate' as const, hint: `${c.newInquiries} new`, href: '/admin/inquiries' },
  ] : [];
  return (
    <>
      <PortalHeader title="Dashboard" subtitle="Live overview from the Google Sheets database." action={<><ButtonLink href="/admin/events/new" variant="accent">Create event</ButtonLink><ButtonLink href="/admin/reports" variant="light">Reports</ButtonLink></>} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading ? Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28" />) : tiles.map((t) => (
          <Link key={t.label} href={t.href || '#'} className={t.href ? 'transition hover:-translate-y-0.5' : 'pointer-events-none'}>
            <StatCard label={t.label} value={t.value} icon={<t.icon className="size-5" />} hint={t.hint} tone={t.tone} className="h-full" />
          </Link>
        ))}
      </div>
      {d && (
        <>
          <div className="mt-6 grid gap-6 xl:grid-cols-2">
            <Card><CardHeader title="Registrations by month" subtitle="Event registrations, last 12 months" /><div className="p-5"><ColumnChart label="Registrations by month" labels={labels} values={d.charts.registrations} /></div></Card>
            <Card><CardHeader title="Revenue by month" subtitle="Successful payments" /><div className="p-5"><ColumnChart label="Revenue by month" labels={labels} values={d.charts.revenue} format={(n) => formatMoney(n, d.currency).replace('Free', '0')} /></div></Card>
            <Card><CardHeader title="Memberships by month" subtitle="New applications" /><div className="p-5"><ColumnChart label="Memberships by month" labels={labels} values={d.charts.memberships} /></div></Card>
            <Card><CardHeader title="Events by month" subtitle="By start date" /><div className="p-5"><ColumnChart label="Events by month" labels={labels} values={d.charts.events} /></div></Card>
          </div>
          <div className="mt-6 grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            <Card><CardHeader title="Students by age group" /><div className="p-5"><BarList data={d.charts.studentsByAge} /></div></Card>
            <Card><CardHeader title="Students by gender" /><div className="p-5"><BarList data={d.charts.studentsByGender} /></div></Card>
            <Card><CardHeader title="Events by type" /><div className="p-5"><BarList data={d.charts.eventsByType} /></div></Card>
            <Card><CardHeader title="Memberships by type" /><div className="p-5"><BarList data={d.charts.membershipsByType} /></div></Card>
          </div>
          <div className="mt-6 grid gap-6 xl:grid-cols-[2fr_1fr]">
            <Card>
              <CardHeader title="Recent registrations" action={<Link href="/admin/registrations" className="text-sm font-bold text-brand-700">View all</Link>} />
              <ul className="divide-y divide-line">
                {d.recentRegistrations.map((r) => (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0"><p className="font-semibold">{r.student}</p><p className="truncate text-xs text-muted">{r.event} · {r.id} · {formatDate(r.date)}</p></div>
                    <div className="flex gap-2"><StatusBadge status={r.status} /><StatusBadge status={r.payment} /></div>
                  </li>
                ))}
                {!d.recentRegistrations.length && <li className="px-5 py-6 text-sm text-muted">No registrations yet.</li>}
              </ul>
            </Card>
            <Card><CardHeader title="Certificates issued" subtitle="Last 12 months" /><div className="p-5"><ColumnChart label="Certificates issued by month" labels={labels} values={d.charts.certificates} height={160} /></div>
              <div className="flex items-center gap-2 border-t border-line px-5 py-3 text-xs text-muted"><Hourglass className="size-4" />New students this year: {d.charts.students.reduce((a, b) => a + b, 0)}</div></Card>
          </div>
        </>
      )}
    </>
  );
}
