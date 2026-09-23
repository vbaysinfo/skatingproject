import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/format';

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'light' | 'outline-light';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 rounded-full font-semibold tracking-wide transition-all duration-200 ' +
  'disabled:cursor-not-allowed disabled:opacity-55 select-none whitespace-nowrap active:scale-[0.98]';

const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 shadow-[0_8px_20px_-10px_rgb(31_69_207/0.8)]',
  accent: 'bg-accent-500 text-white hover:bg-accent-600 shadow-[0_8px_20px_-10px_rgb(255_106_19/0.9)]',
  secondary: 'bg-white text-ink ring-1 ring-line hover:ring-brand-300 hover:text-brand-700',
  ghost: 'text-ink-soft hover:bg-surface',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  light: 'bg-white text-ink hover:bg-brand-50',
  'outline-light': 'text-white ring-1 ring-white/40 hover:bg-white/10',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-4 text-[13px]',
  md: 'h-11 px-5 text-sm',
  lg: 'h-13 px-7 text-[15px]',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', extra?: string) {
  return cn(base, variants[variant], sizes[size], extra);
}

type BtnProps = ComponentProps<'button'> & { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode };

export function Button({ variant = 'primary', size = 'md', loading, icon, className, children, disabled, ...rest }: BtnProps) {
  return (
    <button className={buttonClass(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden /> : icon}
      {children}
    </button>
  );
}

type LinkProps = ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: ReactNode };

export function ButtonLink({ variant = 'primary', size = 'md', icon, className, children, ...rest }: LinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
