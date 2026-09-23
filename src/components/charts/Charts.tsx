'use client';
import { useState } from 'react';
import { cn } from '@/lib/format';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const monthLabel = (ym: string) => { const m = /^(\d{4})-(\d{2})/.exec(ym); return m ? `${MONTHS[+m[2] - 1]} ${m[1].slice(2)}` : ym; };

function niceMax(v: number) {
  if (v <= 0) return 4;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}

/**
 * Single-series column chart (one hue, recessive grid, rounded data-ends,
 * hover tooltip, table fallback for screen readers).
 */
export function ColumnChart({ labels, values, format = (n) => n.toLocaleString('en-IN'), height = 200, label }: {
  labels: string[]; values: number[]; format?: (n: number) => string; height?: number; label: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...values));
  const W = 600, H = height, padL = 36, padB = 24, padT = 10;
  const bw = (W - padL) / values.length;
  const barW = Math.max(6, Math.min(28, bw - 10));
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / max);
  const ticks = [0, max / 2, max];
  return (
    <figure className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} stroke="#e3e8ef" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#5b6678">{format(t)}</text>
          </g>
        ))}
        {values.map((v, i) => {
          const x = padL + i * bw + (bw - barW) / 2;
          const h = Math.max(0, H - padB - y(v));
          const r = Math.min(4, h / 2, barW / 2);
          const top = H - padB - h;
          return (
            <g key={i} onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} tabIndex={0} aria-label={`${labels[i]}: ${format(v)}`}>
              <rect x={padL + i * bw} y={padT} width={bw} height={H - padT - padB} fill="transparent" />
              {h > 0 && (
                <path d={`M${x},${H - padB} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${H - padB} Z`}
                  fill={hover === i ? '#1a37a6' : '#3461e8'} />
              )}
              {(i % Math.ceil(values.length / 6) === 0 || i === values.length - 1) && (
                <text x={padL + i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize="11" fill="#5b6678">{labels[i]}</text>
              )}
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div className="pointer-events-none absolute top-0 rounded-lg bg-ink px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{ left: `${((padL + hover * bw + bw / 2) / W) * 100}%`, transform: 'translateX(-50%)' }}>
          <span className="text-white/70">{labels[hover]}</span> <strong>{format(values[hover]!)}</strong>
        </div>
      )}
      <table className="sr-only"><caption>{label}</caption><tbody>{labels.map((l, i) => <tr key={l}><th>{l}</th><td>{format(values[i]!)}</td></tr>)}</tbody></table>
    </figure>
  );
}

/** Horizontal bar list for categorical breakdowns (single hue, values labelled in text ink). */
export function BarList({ data, className, max: maxItems = 8 }: { data: Record<string, number>; className?: string; max?: number }) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, maxItems);
  const top = Math.max(1, ...rows.map((r) => r[1]));
  if (!rows.length) return <p className="text-sm text-muted">No data yet.</p>;
  return (
    <ul className={cn('space-y-3', className)}>
      {rows.map(([k, v]) => (
        <li key={k} title={`${k}: ${v}`}>
          <div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate text-ink-soft">{k.replace(/_/g, ' ')}</span><span className="font-semibold text-ink">{v.toLocaleString('en-IN')}</span></div>
          <div className="h-2 rounded-full bg-surface"><div className="h-2 rounded-full bg-brand-500" style={{ width: `${(v / top) * 100}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}
