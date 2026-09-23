import Link from 'next/link';
import { cn } from '@/lib/format';

/** Association logo from Settings (SITE_LOGO) with a designed fallback mark. */
export function LogoMark({ logoUrl, className }: { logoUrl?: string; className?: string }) {
  if (logoUrl) return <img src={logoUrl} alt="" className={cn('size-10 rounded-xl object-contain', className)} />;
  return (
    <span className={cn('grid size-10 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-md', className)} aria-hidden>
      <svg viewBox="0 0 32 32" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 20h15.5c2.5 0 4.5-1.8 4.5-4.2V9.5" />
        <path d="M11 20V8h6l1.5 5" />
        <circle cx="10" cy="25" r="2.4" fill="#ff6a13" stroke="none" />
        <circle cx="20" cy="25" r="2.4" fill="#ff6a13" stroke="none" />
      </svg>
    </span>
  );
}

export function Logo({ name, logoUrl, light, className }: { name: string; logoUrl?: string; light?: boolean; className?: string }) {
  const words = name.split(' ');
  const first = words.slice(0, Math.max(1, words.length - 1)).join(' ');
  const last = words.length > 1 ? words[words.length - 1] : '';
  return (
    <Link href="/" className={cn('flex min-w-0 items-center gap-3', className)} aria-label={name + ' — home'}>
      <LogoMark logoUrl={logoUrl} />
      <span className={cn('min-w-0 font-display text-[17px] font-extrabold uppercase leading-[0.95] tracking-wide', light ? 'text-white' : 'text-ink')}>
        <span className="block truncate">{first}</span>
        {last && <span className={cn('block text-[12px] tracking-[0.25em]', light ? 'text-accent-400' : 'text-accent-600')}>{last}</span>}
      </span>
    </Link>
  );
}
