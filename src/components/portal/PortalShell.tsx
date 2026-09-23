'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode, type ComponentType } from 'react';
import { LogOut, Menu, X, ExternalLink } from 'lucide-react';
import type { SessionUser } from '@/lib/types';
import { api } from '@/lib/api';
import { cn, initials } from '@/lib/format';
import { LogoMark } from '@/components/site/Logo';

export type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }>; exact?: boolean; badge?: number };

/** Sidebar layout shared by the student and admin portals (drawer on mobile). */
export function PortalShell({ user, nav, siteName, logoUrl, portalLabel, children, tone = 'light' }: {
  user: SessionUser; nav: NavItem[]; siteName: string; logoUrl?: string; portalLabel: string; children: ReactNode; tone?: 'light' | 'dark';
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onUnauthorized = () => router.replace((user.role === 'ADMIN' ? '/admin/login' : '/login') + '?next=' + encodeURIComponent(pathname));
    window.addEventListener('sa:unauthorized', onUnauthorized);
    return () => window.removeEventListener('sa:unauthorized', onUnauthorized);
  }, [router, pathname, user.role]);

  async function logout() {
    await api.logout().catch(() => undefined);
    router.replace(user.role === 'ADMIN' ? '/admin/login' : '/login');
    router.refresh();
  }

  const active = (n: NavItem) => (n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + '/'));
  const dark = tone === 'dark';
  const sidebar = (
    <div className={cn('flex h-full flex-col', dark ? 'bg-ink text-white' : 'bg-white')}>
      <div className={cn('flex h-[72px] items-center gap-3 border-b px-5', dark ? 'border-white/10' : 'border-line')}>
        <LogoMark logoUrl={logoUrl} className="size-9" />
        <div className="min-w-0">
          <p className="truncate font-display text-[15px] font-extrabold uppercase leading-tight">{siteName}</p>
          <p className={cn('text-[10px] font-bold uppercase tracking-[0.2em]', dark ? 'text-accent-400' : 'text-accent-600')}>{portalLabel}</p>
        </div>
      </div>
      <nav aria-label={portalLabel} className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-0.5">
          {nav.map((n) => (
            <li key={n.href}>
              <Link href={n.href} aria-current={active(n) ? 'page' : undefined}
                className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition',
                  active(n) ? (dark ? 'bg-white/10 text-white' : 'bg-brand-50 text-brand-700') : (dark ? 'text-white/65 hover:bg-white/5 hover:text-white' : 'text-ink-soft hover:bg-surface'))}>
                <n.icon className={cn('size-[18px] shrink-0', active(n) ? (dark ? 'text-accent-400' : 'text-brand-600') : 'opacity-70')} />
                <span className="flex-1">{n.label}</span>
                {!!n.badge && <span className="rounded-full bg-accent-500 px-2 py-0.5 text-[10px] font-bold text-white">{n.badge}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className={cn('border-t p-3', dark ? 'border-white/10' : 'border-line')}>
        <Link href="/" className={cn('mb-1 flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-semibold', dark ? 'text-white/60 hover:text-white' : 'text-muted hover:text-ink')}>
          <ExternalLink className="size-4" />View website
        </Link>
        <div className={cn('flex items-center gap-3 rounded-xl p-2', dark ? 'bg-white/5' : 'bg-surface')}>
          {user.photoUrl ? <img src={user.photoUrl} alt="" className="size-9 rounded-full object-cover" />
            : <span className="grid size-9 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">{initials(user.name || user.email)}</span>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{user.name || user.email}</p>
            <p className={cn('truncate text-[11px]', dark ? 'text-white/50' : 'text-muted')}>{user.studentId || user.email}</p>
          </div>
          <button type="button" onClick={logout} className={cn('grid size-9 place-items-center rounded-full', dark ? 'hover:bg-white/10' : 'hover:bg-white')} aria-label="Logout" title="Logout">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-surface lg:grid lg:grid-cols-[272px_1fr]">
      <a href="#portal-main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <aside className={cn('sticky top-0 hidden h-dvh border-r lg:block', dark ? 'border-ink' : 'border-line')}>{sidebar}</aside>
      <div className={cn('sticky top-0 z-40 flex h-16 items-center justify-between border-b px-4 lg:hidden', dark ? 'border-white/10 bg-ink text-white' : 'border-line bg-white')}>
        <div className="flex items-center gap-2.5"><LogoMark logoUrl={logoUrl} className="size-8" /><span className="font-display text-sm font-bold uppercase">{portalLabel}</span></div>
        <button type="button" onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full ring-1 ring-current/20" aria-label="Open menu" aria-expanded={open}><Menu className="size-5" /></button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/50" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-xs shadow-2xl">
            {sidebar}
            <button type="button" onClick={() => setOpen(false)} className="absolute right-3 top-4 grid size-9 place-items-center rounded-full bg-surface text-ink" aria-label="Close menu"><X className="size-4" /></button>
          </div>
        </div>
      )}
      <main id="portal-main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
    </div>
  );
}

export function PortalHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-4xl font-extrabold uppercase leading-none text-ink">{title}</h1>
        {subtitle && <p className="mt-2 text-[15px] text-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  );
}
