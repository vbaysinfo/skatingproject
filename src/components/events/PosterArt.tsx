import { cn, formatDateRange, labelize } from '@/lib/format';

const PALETTES = [
  ['#0f1f57', '#1f45cf', '#ff6a13'],
  ['#0a1628', '#1a37a6', '#5a86f7'],
  ['#1a1033', '#5b21b6', '#ff8a47'],
  ['#062a2a', '#0f766e', '#fbbf24'],
  ['#2a0a12', '#b91c1c', '#ffb86b'],
];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Generated poster used when an event/program has no uploaded image. */
export function PosterArt({ title, subtitle, kicker, className, seed }: { title: string; subtitle?: string; kicker?: string; className?: string; seed?: string }) {
  const p = PALETTES[hash(seed || title) % PALETTES.length]!;
  const id = 'g' + hash(title + (seed || ''));
  return (
    <div className={cn('relative overflow-hidden', className)} style={{ background: `linear-gradient(135deg, ${p[0]}, ${p[1]})` }} role="img" aria-label={title}>
      <svg className="absolute inset-0 size-full" viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id={id} x1="0" x2="1">
            <stop offset="0" stopColor={p[2]} stopOpacity="0" />
            <stop offset="1" stopColor={p[2]} stopOpacity="0.9" />
          </linearGradient>
        </defs>
        <ellipse cx="200" cy="330" rx="330" ry="150" fill="none" stroke="white" strokeOpacity="0.12" strokeWidth="26" />
        <ellipse cx="200" cy="330" rx="260" ry="100" fill="none" stroke="white" strokeOpacity="0.08" strokeWidth="2" strokeDasharray="10 12" />
        {[0, 1, 2, 3].map((i) => <rect key={i} x={-40 + i * 30} y={70 + i * 26} width={260 - i * 40} height="7" rx="3.5" fill={`url(#${id})`} transform="skewX(-25)" />)}
        <circle cx="330" cy="70" r="46" fill={p[2]} fillOpacity="0.9" />
        <circle cx="330" cy="70" r="20" fill={p[0]} fillOpacity="0.9" />
      </svg>
      <div className="absolute inset-x-0 bottom-0 p-5 text-white">
        {kicker && <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-white/75">{kicker}</p>}
        <p className="mt-1 line-clamp-3 font-display text-[26px] font-extrabold uppercase leading-[0.95] drop-shadow">{title}</p>
        {subtitle && <p className="mt-1.5 text-xs font-semibold uppercase tracking-wider text-white/80">{subtitle}</p>}
      </div>
    </div>
  );
}

export function EventPoster({ url, name, type, start, end, className }: { url: string; name: string; type: string; start: string; end: string; className?: string }) {
  if (url) return <img src={url} alt={name + ' poster'} loading="lazy" decoding="async" className={cn('object-cover', className)} />;
  return <PosterArt title={name} kicker={labelize(type) + ' event'} subtitle={formatDateRange(start, end)} className={className} seed={type} />;
}
