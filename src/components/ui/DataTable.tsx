'use client';
import type { ReactNode } from 'react';
import { cn } from '@/lib/format';
import { EmptyState, Skeleton } from './States';

export type Column<T> = {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  className?: string;
  /** Hide on the mobile card layout. */
  hideOnMobile?: boolean;
  /** Used as the title of the mobile card. */
  primary?: boolean;
};

/**
 * Responsive table: a clean table on desktop, stacked cards on mobile.
 */
export function DataTable<T extends Record<string, unknown>>({ columns, rows, rowKey, loading, empty, onRowClick, actions, selectable, selected, onSelect }: {
  columns: Column<T>[]; rows: T[]; rowKey: (r: T) => string; loading?: boolean; empty?: ReactNode; onRowClick?: (r: T) => void;
  actions?: (r: T) => ReactNode; selectable?: boolean; selected?: Set<string>; onSelect?: (ids: Set<string>) => void;
}) {
  const cell = (c: Column<T>, r: T) => (c.render ? c.render(r) : (r[c.key] as ReactNode) ?? '');
  if (loading) {
    return <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>;
  }
  if (!rows.length) return <div className="p-4">{empty || <EmptyState title="Nothing here yet" />}</div>;
  const allIds = rows.map(rowKey);
  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelect?.(next);
  };
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-surface/70 text-[11px] font-bold uppercase tracking-wider text-muted">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input type="checkbox" aria-label="Select all" className="size-4 accent-brand-600"
                    checked={allIds.length > 0 && allIds.every((id) => selected?.has(id))}
                    onChange={(e) => onSelect?.(new Set(e.target.checked ? allIds : []))} />
                </th>
              )}
              {columns.map((c) => <th key={c.key} scope="col" className={cn('px-4 py-3 whitespace-nowrap', c.className)}>{c.header}</th>)}
              {actions && <th className="px-4 py-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const id = rowKey(r);
              return (
                <tr key={id} onClick={onRowClick ? () => onRowClick(r) : undefined}
                  className={cn('border-b border-line/70 last:border-0 hover:bg-brand-50/40', onRowClick && 'cursor-pointer')}>
                  {selectable && (
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={'Select ' + id} className="size-4 accent-brand-600" checked={!!selected?.has(id)} onChange={() => toggle(id)} />
                    </td>
                  )}
                  {columns.map((c) => <td key={c.key} className={cn('px-4 py-3 align-middle', c.className)}>{cell(c, r)}</td>)}
                  {actions && <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>{actions(r)}</td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-line md:hidden">
        {rows.map((r) => {
          const id = rowKey(r);
          const primary = columns.find((c) => c.primary) || columns[0]!;
          return (
            <li key={id} className="p-4" onClick={onRowClick ? () => onRowClick(r) : undefined}>
              <div className="flex items-start gap-3">
                {selectable && (
                  <input type="checkbox" aria-label={'Select ' + id} className="mt-1 size-5 accent-brand-600" checked={!!selected?.has(id)}
                    onClick={(e) => e.stopPropagation()} onChange={() => toggle(id)} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-ink">{cell(primary, r)}</div>
                  <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                    {columns.filter((c) => c !== primary && !c.hideOnMobile).map((c) => (
                      <div key={c.key} className="min-w-0">
                        <dt className="text-[11px] font-semibold uppercase tracking-wider text-muted">{c.header}</dt>
                        <dd className="truncate text-ink-soft">{cell(c, r)}</dd>
                      </div>
                    ))}
                  </dl>
                  {actions && <div className="mt-3 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>{actions(r)}</div>}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
