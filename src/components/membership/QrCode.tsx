'use client';
import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { cn } from '@/lib/format';

/** Renders a QR code for `value` entirely in the browser (no third-party service). */
export function QrCode({ value, size = 160, className, label }: { value: string; size?: number; className?: string; label?: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(value, { margin: 1, width: size * 2, color: { dark: '#0a1628', light: '#ffffff' }, errorCorrectionLevel: 'M' })
      .then((url) => { if (alive) setSrc(url); })
      .catch(() => setSrc(''));
    return () => { alive = false; };
  }, [value, size]);
  return src ? <img src={src} width={size} height={size} alt={label || 'QR code'} className={cn('rounded-lg bg-white', className)} />
    : <span className={cn('skeleton block', className)} style={{ width: size, height: size }} aria-hidden />;
}
