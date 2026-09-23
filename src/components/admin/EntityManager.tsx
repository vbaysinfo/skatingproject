'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { Plus, Search, Pencil, Archive, Trash2 } from 'lucide-react';
import { api, ApiError, type Paged } from '@/lib/api';
import type { Row } from '@/lib/types';
import { formatDate, formatMoney, labelize } from '@/lib/format';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Checkbox, Field, FormError, Input, Select, Textarea } from '@/components/ui/Form';
import { StatusBadge } from '@/components/ui/Badge';
import { PagerButtons } from '@/components/ui/Pagination';
import { EmptyState } from '@/components/ui/States';
import { useToast } from '@/components/ui/Toast';
import { EventSelect, ImageInput, StudentPicker } from './Inputs';

export type FieldDef = {
  name: string; label: string;
  type?: 'text' | 'textarea' | 'number' | 'date' | 'select' | 'bool' | 'url' | 'image' | 'event' | 'student';
  options?: (string | { value: string; label: string })[]; required?: boolean; help?: string; full?: boolean; placeholder?: string;
};
export type ColDef = { key: string; header: string; type?: 'text' | 'badge' | 'image' | 'date' | 'money' | 'bool' | 'mono' | 'label'; render?: (r: Row) => ReactNode; primary?: boolean; hideOnMobile?: boolean };

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));

function renderCell(c: ColDef, r: Row): ReactNode {
  if (c.render) return c.render(r);
  const v = r[c.key];
  switch (c.type) {
    case 'badge': return <StatusBadge status={s(v)} />;
    case 'image': return v ? <img src={s(v)} alt="" className="size-12 rounded-lg object-cover" loading="lazy" /> : <span className="grid size-12 place-items-center rounded-lg bg-surface text-xs text-muted">—</span>;
    case 'date': return formatDate(s(v)) || '—';
    case 'money': return formatMoney(s(v));
    case 'bool': return /^(true|yes|1)$/i.test(s(v)) ? 'Yes' : '—';
    case 'mono': return <span className="font-mono text-xs">{s(v)}</span>;
    case 'label': return labelize(s(v));
    default: return s(v) || '—';
  }
}

/**
 * Generic list + create/edit/archive screen backed by admin.list / admin.save /
 * admin.delete. Every change is written to Google Sheets and the related
 * public caches are cleared by the backend.
 */
export function EntityManager({ entity, noun, columns, fields, statuses, filters, defaults, canCreate = true, canDelete = true, hardDelete, readOnly,
  rowActions, headerActions, fixedFilters, pageSize = 25, searchPlaceholder }: {
  entity: string; noun: string; columns: ColDef[]; fields?: FieldDef[]; statuses?: string[]; filters?: { name: string; label: string; options: string[] }[];
  defaults?: Record<string, unknown>; canCreate?: boolean; canDelete?: boolean; hardDelete?: boolean; readOnly?: boolean;
  rowActions?: (r: Row, reload: () => void) => ReactNode; headerActions?: (reload: () => void) => ReactNode; fixedFilters?: Record<string, string>;
  pageSize?: number; searchPlaceholder?: string;
}) {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [extra, setExtra] = useState<Record<string, string>>({});
  const [data, setData] = useState<Paged<Row> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Row | null>(null);
  const [form, setForm] = useState<Record<string, unknown>>({});
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const reload = () => setTick((t) => t + 1);
  const filterKey = JSON.stringify(fixedFilters || {});

  useEffect(() => {
    let alive = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const t = setTimeout(() => {
      api.admin.list(entity, { page, pageSize, q, status, filters: { ...extra, ...JSON.parse(filterKey) } })
        .then((d) => { if (alive) { setData(d); setError(null); } })
        .catch((e) => { if (alive) setError(e instanceof ApiError ? e.message : 'Could not load data'); })
        .finally(() => { if (alive) setLoading(false); });
    }, q ? 250 : 0);
    return () => { alive = false; clearTimeout(t); };
  }, [entity, page, pageSize, q, status, extra, filterKey, tick]);

  const pk = data?.primaryKey || '';
  function openNew() { setEditing(null); setForm({ ...(defaults || {}), ...(fixedFilters || {}) }); setFormError(null); setOpen(true); }
  function openEdit(r: Row) { setEditing(r); setForm({ ...r }); setFormError(null); setOpen(true); }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const payload: Record<string, unknown> = {};
      (fields || []).forEach((f) => { payload[f.name] = f.type === 'bool' ? (form[f.name] === true || /^true$/i.test(s(form[f.name])) ? 'TRUE' : 'FALSE') : form[f.name] ?? ''; });
      await api.admin.save(entity, payload, editing ? s(editing[pk]) : undefined, editing ? s(editing.Updated_At) || undefined : undefined);
      toast(editing ? `${noun} updated` : `${noun} created`);
      setOpen(false);
      reload();
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  async function remove(r: Row) {
    if (!confirm(hardDelete ? `Delete this ${noun.toLowerCase()} permanently?` : `Archive this ${noun.toLowerCase()}? It will be hidden from the website.`)) return;
    try {
      await api.admin.remove(entity, s(r[pk]), !!hardDelete);
      toast(hardDelete ? `${noun} deleted` : `${noun} archived`);
      reload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Could not delete', 'error');
    }
  }

  const cols: Column<Row>[] = columns.map((c) => ({ key: c.key, header: c.header, render: (r) => renderCell(c, r), primary: c.primary, hideOnMobile: c.hideOnMobile }));
  const setField = (name: string, v: unknown) => setForm((f) => ({ ...f, [name]: v }));

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="relative min-w-56 flex-1">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder={searchPlaceholder || `Search ${noun.toLowerCase()}s`} className="pl-9" />
        </label>
        {statuses && (
          <Select aria-label="Status filter" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="w-44">
            <option value="">All statuses</option>{statuses.map((x) => <option key={x} value={x}>{labelize(x)}</option>)}
          </Select>
        )}
        {filters?.map((f) => (
          <Select key={f.name} aria-label={f.label} value={extra[f.name] || ''} onChange={(e) => { setExtra({ ...extra, [f.name]: e.target.value }); setPage(1); }} className="w-44">
            <option value="">{f.label}: all</option>{f.options.map((o) => <option key={o} value={o}>{labelize(o)}</option>)}
          </Select>
        ))}
        {headerActions?.(reload)}
        {canCreate && !readOnly && fields && <Button onClick={openNew} icon={<Plus className="size-4" />}>Add {noun.toLowerCase()}</Button>}
      </div>
      <Card>
        {error ? <div className="p-5"><FormError message={error} /></div> : (
          <DataTable<Row> loading={loading && !data} rows={data?.items || []} rowKey={(r) => s(r[pk]) || JSON.stringify(r).slice(0, 40)} columns={cols}
            empty={<EmptyState title={`No ${noun.toLowerCase()}s found`} message={canCreate && !readOnly ? `Click “Add ${noun.toLowerCase()}” to create one.` : undefined} />}
            onRowClick={!readOnly && fields ? openEdit : undefined}
            actions={readOnly ? undefined : (r) => (
              <div className="flex justify-end gap-1">
                {rowActions?.(r, reload)}
                {fields && <button type="button" onClick={() => openEdit(r)} className="grid size-9 place-items-center rounded-full hover:bg-surface" aria-label="Edit" title="Edit"><Pencil className="size-4" /></button>}
                {canDelete && <button type="button" onClick={() => remove(r)} className="grid size-9 place-items-center rounded-full text-red-600 hover:bg-red-50" aria-label={hardDelete ? 'Delete' : 'Archive'} title={hardDelete ? 'Delete' : 'Archive'}>{hardDelete ? <Trash2 className="size-4" /> : <Archive className="size-4" />}</button>}
              </div>
            )} />
        )}
        {data && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3 text-sm text-muted">
            <span>{data.total} {data.total === 1 ? 'record' : 'records'}</span>
            <PagerButtons page={data.page} totalPages={data.totalPages} onPage={setPage} />
          </div>
        )}
      </Card>

      {fields && (
        <Modal open={open} onClose={() => setOpen(false)} title={editing ? `Edit ${noun.toLowerCase()}` : `New ${noun.toLowerCase()}`} size="lg"
          footer={<><Button variant="secondary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" form={`form-${entity}`} loading={busy}>Save</Button></>}>
          <form id={`form-${entity}`} onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {editing && <p className="font-mono text-xs text-muted sm:col-span-2">{s(editing[pk])}{editing.Updated_At ? ` · updated ${s(editing.Updated_At).slice(0, 16).replace('T', ' ')}` : ''}</p>}
            {fields.map((f) => {
              const v = form[f.name];
              const idf = `f-${entity}-${f.name}`;
              let control: ReactNode;
              switch (f.type) {
                case 'textarea': control = <Textarea id={idf} value={s(v)} onChange={(e) => setField(f.name, e.target.value)} required={f.required} placeholder={f.placeholder} rows={4} />; break;
                case 'number': control = <Input id={idf} type="number" min={0} step="any" value={s(v)} onChange={(e) => setField(f.name, e.target.value)} required={f.required} />; break;
                case 'date': control = <Input id={idf} type="date" value={s(v).slice(0, 10)} onChange={(e) => setField(f.name, e.target.value)} required={f.required} />; break;
                case 'select': control = (
                  <Select id={idf} value={s(v)} onChange={(e) => setField(f.name, e.target.value)} required={f.required}>
                    <option value="">Select</option>
                    {f.options?.map((o) => typeof o === 'string' ? <option key={o} value={o}>{labelize(o)}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>); break;
                case 'bool': control = <Checkbox id={idf} checked={v === true || /^(true|yes|1)$/i.test(s(v))} onChange={(e) => setField(f.name, e.target.checked)} label={f.help || 'Yes'} />; break;
                case 'image': control = <ImageInput id={idf} value={s(v)} onChange={(x) => setField(f.name, x)} />; break;
                case 'event': control = <EventSelect id={idf} value={s(v)} onChange={(x) => setField(f.name, x)} required={f.required} />; break;
                case 'student': control = <StudentPicker id={idf} value={s(v)} onChange={(x) => setField(f.name, x)} />; break;
                default: control = <Input id={idf} type={f.type === 'url' ? 'url' : 'text'} value={s(v)} onChange={(e) => setField(f.name, e.target.value)} required={f.required} placeholder={f.placeholder} />;
              }
              return <Field key={f.name} label={f.label} htmlFor={idf} required={f.required} hint={f.type === 'bool' ? undefined : f.help} className={f.full || f.type === 'textarea' ? 'sm:col-span-2' : ''}>{control}</Field>;
            })}
            <div className="sm:col-span-2"><FormError message={formError} /></div>
          </form>
        </Modal>
      )}
    </>
  );
}
