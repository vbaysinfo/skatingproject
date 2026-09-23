import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';
export function generateStaticParams() { return [{ size: '192' }, { size: '512' }]; }

function Mark({ size }: { size: number }) {
  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #3461e8, #0f1f57)' }}>
      <svg width={size * 0.62} height={size * 0.62} viewBox="0 0 32 32" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 20h15.5c2.5 0 4.5-1.8 4.5-4.2V9.5" /><path d="M11 20V8h6l1.5 5" />
        <circle cx="10" cy="25" r="2.4" fill="#ff6a13" stroke="none" /><circle cx="20" cy="25" r="2.4" fill="#ff6a13" stroke="none" />
      </svg>
    </div>
  );
}

export async function GET(_req: Request, ctx: RouteContext<'/pwa-icon/[size]'>) {
  const { size } = await ctx.params;
  const n = size === '512' ? 512 : 192;
  return new ImageResponse(<Mark size={n} />, { width: n, height: n });
}
