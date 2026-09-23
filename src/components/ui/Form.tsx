import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/format';

const control =
  'w-full rounded-xl border border-line bg-white px-3.5 text-[15px] text-ink shadow-sm transition placeholder:text-slate-400 ' +
  'focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:bg-surface disabled:text-muted aria-[invalid=true]:border-red-400';

export function Field({ label, htmlFor, hint, error, required, children, className }: {
  label: string; htmlFor?: string; hint?: string; error?: string; required?: boolean; children: ReactNode; className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-ink-soft">
        {label}
        {required && <span className="text-accent-600"> *</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

export function Input({ className, ...rest }: ComponentProps<'input'>) {
  return <input className={cn(control, 'h-11', className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<'select'>) {
  return (
    <select className={cn(control, 'h-11 appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2712%27 height=%2712%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%235b6678%27 stroke-width=%272.5%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")] bg-[position:right_14px_center] bg-no-repeat pr-10', className)} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: ComponentProps<'textarea'>) {
  return <textarea className={cn(control, 'min-h-28 py-3 leading-relaxed', className)} {...rest} />;
}

export function Checkbox({ label, className, ...rest }: ComponentProps<'input'> & { label: ReactNode }) {
  return (
    <label className={cn('flex cursor-pointer items-start gap-3 text-sm text-ink-soft', className)}>
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer rounded-md border-line accent-brand-600" {...rest} />
      <span>{label}</span>
    </label>
  );
}

export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-100">{message}</div>;
}

export function FormSuccess({ message }: { message?: string | null }) {
  if (!message) return null;
  return <div role="status" className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-100">{message}</div>;
}
