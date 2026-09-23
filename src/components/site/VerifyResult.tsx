import { ShieldCheck, ShieldX, ShieldAlert, Search } from 'lucide-react';
import { Container, Card } from '@/components/ui/Card';
import { StatusBadge } from '@/components/ui/Badge';
import { buttonClass } from '@/components/ui/Button';
import { cn } from '@/lib/format';

/** Public verification result — shows only non-sensitive fields. */
export function VerifyResult({ kind, id, siteName, found, valid, status, rows, error }: {
  kind: 'member' | 'certificate'; id: string; siteName: string; found: boolean; valid: boolean; status: string; rows: [string, string][]; error?: boolean;
}) {
  const Icon = !found ? ShieldX : valid ? ShieldCheck : ShieldAlert;
  const tone = !found ? 'text-red-600 bg-red-50' : valid ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50';
  const label = kind === 'member' ? 'Membership' : 'Certificate';
  return (
    <div className="bg-surface py-14 sm:py-20">
      <Container className="max-w-xl">
        <Card className="overflow-hidden">
          <div className="bg-ink px-6 py-5 text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent-400">{siteName}</p>
            <h1 className="mt-1 font-display text-3xl font-extrabold uppercase">{label} verification</h1>
          </div>
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-4">
              <span className={cn('grid size-16 place-items-center rounded-2xl', tone)}><Icon className="size-8" aria-hidden /></span>
              <div>
                <p className="font-display text-2xl font-bold uppercase" role="status">
                  {error ? 'Unable to verify right now' : !found ? `${label} not found` : valid ? `Valid ${label.toLowerCase()}` : `${label} ${status.toLowerCase()}`}
                </p>
                <p className="font-mono text-sm text-muted">{id}</p>
              </div>
            </div>
            {found && (
              <dl className="mt-6 divide-y divide-line rounded-2xl ring-1 ring-line">
                {rows.map(([k, v]) => (
                  <div key={k} className="flex flex-wrap justify-between gap-2 px-5 py-3">
                    <dt className="text-sm text-muted">{k}</dt>
                    <dd className="text-right font-semibold">{k.toLowerCase().includes('status') ? <StatusBadge status={v} /> : v}</dd>
                  </div>
                ))}
              </dl>
            )}
            {!found && !error && <p className="mt-5 text-sm text-muted">Check the number and try again. If you believe this is an error, contact the association office.</p>}
            <p className="mt-6 text-xs text-muted">Only public verification details are shown. Personal contact details and documents are never displayed.</p>
          </div>
        </Card>
      </Container>
    </div>
  );
}

export function VerifyLookup({ kind }: { kind: 'member' | 'certificate' }) {
  const label = kind === 'member' ? 'membership number (MEM-…)' : 'certificate number (CERT-…)';
  return (
    <div className="bg-surface py-14 sm:py-20">
      <Container className="max-w-xl">
        <Card className="p-6 sm:p-8">
          <h1 className="font-display text-3xl font-extrabold uppercase">Verify a {kind === 'member' ? 'membership' : 'certificate'}</h1>
          <p className="mt-2 text-sm text-muted">Scan the QR code, or enter the {label}.</p>
          <form className="mt-6 flex gap-2" action={`/verify/${kind}/lookup`}>
            <label htmlFor="vid" className="sr-only">Number</label>
            <input id="vid" name="id" required placeholder={kind === 'member' ? 'MEM-2026-000001' : 'CERT-2026-000001'}
              className="h-12 flex-1 rounded-xl border border-line px-4 font-mono uppercase" />
            <button className={buttonClass('primary', 'lg')}><Search className="size-4" />Verify</button>
          </form>
        </Card>
      </Container>
    </div>
  );
}
