'use client';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CircleCheck, CircleAlert, Info, X } from 'lucide-react';
import { cn } from '@/lib/format';

type ToastKind = 'success' | 'error' | 'info';
type ToastItem = { id: number; kind: ToastKind; message: string };
type ToastFn = (message: string, kind?: ToastKind) => void;

const ToastContext = createContext<ToastFn>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback<ToastFn>((message, kind = 'success') => {
    const id = Date.now() + Math.random();
    setItems((s) => [...s.slice(-3), { id, kind, message }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4500);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:right-6 sm:left-auto sm:items-end" aria-live="polite">
        {items.map((t) => {
          const Icon = t.kind === 'success' ? CircleCheck : t.kind === 'error' ? CircleAlert : Info;
          return (
            <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'}
              className={cn('pointer-events-auto flex w-full max-w-sm animate-[var(--animate-fade-up)] items-start gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-white shadow-[var(--shadow-lift)]',
                t.kind === 'success' && 'bg-emerald-600', t.kind === 'error' && 'bg-red-600', t.kind === 'info' && 'bg-ink')}>
              <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="flex-1">{t.message}</span>
              <button type="button" onClick={() => setItems((s) => s.filter((x) => x.id !== t.id))} aria-label="Dismiss" className="opacity-80 hover:opacity-100">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
