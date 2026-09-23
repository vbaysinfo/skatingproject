'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, LayoutDashboard } from 'lucide-react';
import { Logo } from './Logo';
import { buttonClass } from '@/components/ui/Button';
import { cn } from '@/lib/format';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/events', label: 'Events' },
  { href: '/programs', label: 'Programs' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/membership', label: 'Membership' },
  { href: '/contact', label: 'Contact' },
];

function readRoleHint(): string {
  if (typeof document === 'undefined') return '';
  const m = document.cookie.match(/(?:^|; )sa_role=([^;]+)/);
  return m ? decodeURIComponent(m[1]!) : '';
}

export function Header({ siteName, logoUrl }: { siteName: string; logoUrl?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [role, setRole] = useState('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setRole(readRoleHint()); setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const portal = role === 'ADMIN' ? { href: '/admin', label: 'Admin' } : role === 'STUDENT' ? { href: '/dashboard', label: 'My Dashboard' } : null;

  return (
    <header className={cn('sticky top-0 z-50 transition-all duration-300', scrolled || open ? 'bg-white/95 shadow-[0_6px_24px_-16px_rgb(10_22_40/0.5)] backdrop-blur-md' : 'bg-white')}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo name={siteName} logoUrl={logoUrl} className="max-w-[60%] lg:max-w-none" />
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={isActive(n.href) ? 'page' : undefined}
                  className={cn('relative rounded-full px-3.5 py-2 text-[13px] font-bold uppercase tracking-wider transition',
                    isActive(n.href) ? 'text-brand-700' : 'text-ink-soft hover:text-brand-700')}>
                  {n.label}
                  {isActive(n.href) && <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded bg-accent-500" aria-hidden />}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          {portal ? (
            <Link href={portal.href} className={buttonClass('primary', 'sm')}><LayoutDashboard className="size-4" />{portal.label}</Link>
          ) : (
            <>
              <Link href="/login" className={buttonClass('ghost', 'sm', 'uppercase')}>Login</Link>
              <Link href="/register" className={buttonClass('accent', 'sm', 'uppercase')}>Register</Link>
            </>
          )}
        </div>
        <button type="button" className="grid size-11 place-items-center rounded-full text-ink ring-1 ring-line lg:hidden" onClick={() => setOpen((o) => !o)}
          aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>
      <div id="mobile-nav" hidden={!open} className="h-[calc(100dvh-72px)] overflow-y-auto border-t border-line bg-white lg:hidden">
        <nav aria-label="Mobile" className="px-4 py-4">
          <ul className="space-y-1">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} aria-current={isActive(n.href) ? 'page' : undefined}
                  className={cn('flex items-center justify-between rounded-2xl px-4 py-3.5 font-display text-2xl font-bold uppercase',
                    isActive(n.href) ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-surface')}>
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {portal ? (
              <Link href={portal.href} className={buttonClass('primary', 'lg', 'col-span-2')}>{portal.label}</Link>
            ) : (
              <>
                <Link href="/login" className={buttonClass('secondary', 'lg')}>Login</Link>
                <Link href="/register" className={buttonClass('accent', 'lg')}>Register</Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
