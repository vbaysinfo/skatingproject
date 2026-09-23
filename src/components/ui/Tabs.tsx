import Link from 'next/link';
import { cn } from '@/lib/format';

/** Link tabs: state lives in the URL so every tab is shareable and SEO-friendly. */
export function LinkTabs({ tabs, active, className }: { tabs: { key: string; label: string; href: string; count?: number }[]; active: string; className?: string }) {
  return (
    <div role="tablist" className={cn('inline-flex gap-1 rounded-full bg-surface p-1 ring-1 ring-line', className)}>
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} role="tab" aria-selected={t.key === active} scroll={false}
          className={cn('rounded-full px-4 py-2 text-[13px] font-bold uppercase tracking-wider transition sm:px-5',
            t.key === active ? 'bg-ink text-white shadow' : 'text-muted hover:text-ink')}>
          {t.label}
          {t.count !== undefined && <span className="ml-1.5 opacity-70">{t.count}</span>}
        </Link>
      ))}
    </div>
  );
}

export function ButtonTabs({ tabs, active, onChange, className }: { tabs: { key: string; label: string }[]; active: string; onChange: (k: string) => void; className?: string }) {
  return (
    <div role="tablist" className={cn('scrollbar-none inline-flex max-w-full gap-1 overflow-x-auto rounded-full bg-surface p-1 ring-1 ring-line', className)}>
      {tabs.map((t) => (
        <button type="button" key={t.key} role="tab" aria-selected={t.key === active} onClick={() => onChange(t.key)}
          className={cn('shrink-0 rounded-full px-4 py-2 text-[13px] font-bold uppercase tracking-wider transition',
            t.key === active ? 'bg-ink text-white shadow' : 'text-muted hover:text-ink')}>
          {t.label}
        </button>
      ))}
    </div>
  );
}
