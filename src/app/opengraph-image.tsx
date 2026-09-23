import { ImageResponse } from 'next/og';
import { getSettings } from '@/lib/server/data';

export const alt = 'Skating association';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const revalidate = 3600;

/** Default social preview generated from the Settings sheet. */
export default async function Image() {
  const s = await getSettings();
  const lines = (s.HERO_TITLE || s.SITE_NAME).split(/\n+/).slice(0, 3);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 70,
        background: 'linear-gradient(135deg, #0a1628 0%, #0f1f57 60%, #1a37a6 100%)', color: 'white', fontFamily: 'sans-serif' }}>
        <div style={{ display: 'flex', fontSize: 30, letterSpacing: 6, color: '#ff8a47', textTransform: 'uppercase', fontWeight: 700 }}>{s.SITE_NAME}</div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {lines.map((l, i) => <div key={i} style={{ display: 'flex', fontSize: 76, fontWeight: 900, lineHeight: 1, color: i === lines.length - 1 ? '#ff6a13' : 'white' }}>{l}</div>)}
        </div>
        <div style={{ display: 'flex', fontSize: 26, color: 'rgba(255,255,255,0.75)' }}>{s.SITE_TAGLINE}</div>
      </div>
    ),
    size,
  );
}
