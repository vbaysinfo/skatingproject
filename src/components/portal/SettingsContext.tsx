'use client';
import { createContext, useContext, type ReactNode } from 'react';
import type { Settings } from '@/lib/types';

const Ctx = createContext<Settings>({ SITE_NAME: 'Skating Association', SITE_LOGO: '', TIMEZONE: 'Asia/Kolkata', DEFAULT_CURRENCY: 'INR', PAYMENT_GATEWAY: 'MANUAL', GOOGLE_CLIENT_ID: '' });

/** Public settings (name, logo, timezone, currency) for client components in the portals. */
export function SettingsProvider({ settings, children }: { settings: Settings; children: ReactNode }) {
  return <Ctx.Provider value={settings}>{children}</Ctx.Provider>;
}
export const useSettings = () => useContext(Ctx);
