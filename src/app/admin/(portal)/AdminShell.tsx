'use client';
import { LayoutDashboard, Users, IdCard, CalendarDays, ClipboardList, GraduationCap, BadgeCheck, Trophy, Award, Images, Megaphone, Handshake,
  CreditCard, FileBarChart, Globe, Settings, Inbox, Medal, ListOrdered, ScrollText } from 'lucide-react';
import type { SessionUser } from '@/lib/types';
import { PortalShell, type NavItem } from '@/components/portal/PortalShell';

const NAV: NavItem[] = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/students', label: 'Students', icon: Users },
  { href: '/admin/memberships', label: 'Memberships', icon: IdCard },
  { href: '/admin/events', label: 'Events', icon: CalendarDays },
  { href: '/admin/registrations', label: 'Registrations', icon: ClipboardList },
  { href: '/admin/programs', label: 'Programs', icon: GraduationCap },
  { href: '/admin/certifications', label: 'Certifications', icon: BadgeCheck },
  { href: '/admin/results', label: 'Results', icon: Trophy },
  { href: '/admin/certificates', label: 'Certificates', icon: Award },
  { href: '/admin/achievements', label: 'Achievements', icon: Medal },
  { href: '/admin/rankings', label: 'Ranking rules', icon: ListOrdered },
  { href: '/admin/gallery', label: 'Gallery', icon: Images },
  { href: '/admin/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/admin/sponsors', label: 'Sponsors', icon: Handshake },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/inquiries', label: 'Inquiries', icon: Inbox },
  { href: '/admin/reports', label: 'Reports', icon: FileBarChart },
  { href: '/admin/website', label: 'Website', icon: Globe },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
  { href: '/admin/logs', label: 'Audit logs', icon: ScrollText },
];

export function AdminShell({ user, siteName, logoUrl, children }: { user: SessionUser; siteName: string; logoUrl?: string; children: React.ReactNode }) {
  return <PortalShell user={user} nav={NAV} siteName={siteName} logoUrl={logoUrl} portalLabel="Admin portal" tone="dark">{children}</PortalShell>;
}
