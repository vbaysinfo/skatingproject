'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LayoutDashboard, UserRound, IdCard, CalendarDays, ClipboardList, Trophy, Award, Medal, Bell, FolderOpen } from 'lucide-react';
import type { SessionUser } from '@/lib/types';
import { PortalShell, type NavItem } from '@/components/portal/PortalShell';

const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/profile', label: 'My Profile', icon: UserRound },
  { href: '/dashboard/membership', label: 'My Membership', icon: IdCard },
  { href: '/dashboard/events', label: 'My Events', icon: CalendarDays },
  { href: '/dashboard/registrations', label: 'My Registrations', icon: ClipboardList },
  { href: '/dashboard/results', label: 'My Results', icon: Trophy },
  { href: '/dashboard/certificates', label: 'My Certificates', icon: Award },
  { href: '/dashboard/achievements', label: 'My Achievements', icon: Medal },
  { href: '/dashboard/documents', label: 'Documents', icon: FolderOpen },
  { href: '/dashboard/notifications', label: 'Notifications', icon: Bell },
];

export function StudentShell({ user, siteName, logoUrl, children }: { user: SessionUser; siteName: string; logoUrl?: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  useEffect(() => {
    if (user.needsProfile && pathname !== '/dashboard/complete-profile') router.replace('/dashboard/complete-profile');
  }, [user.needsProfile, pathname, router]);
  return <PortalShell user={user} nav={NAV} siteName={siteName} logoUrl={logoUrl} portalLabel="Athlete portal">{children}</PortalShell>;
}
