import Link from 'next/link';
import { Mail, MapPin, Phone } from 'lucide-react';
import type { Settings } from '@/lib/types';
import { Logo } from './Logo';
import { SocialIcons } from './SocialIcons';

export function Footer({ settings }: { settings: Settings }) {
  const year = new Date().getFullYear();
  const cols = [
    { title: 'Quick Links', links: [['About', '/about'], ['Events', '/events'], ['Programs', '/programs'], ['Gallery', '/gallery']] },
    { title: 'Athletes', links: [['Membership', '/membership'], ['Rankings', '/rankings'], ['Register', '/register'], ['Login', '/login']] },
    { title: 'Support', links: [['Contact', '/contact'], ['Verify Membership', '/verify/member'], ['Verify Certificate', '/verify/certificate'], ['Privacy Policy', '/privacy'], ['Terms & Conditions', '/terms']] },
  ];
  return (
    <footer className="relative overflow-hidden bg-ink text-white">
      <div className="speed-lines absolute inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto max-w-7xl px-4 pt-16 pb-8 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_2fr]">
          <div>
            <Logo name={settings.SITE_NAME} logoUrl={settings.SITE_LOGO} light />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-white/65">{settings.SITE_TAGLINE || settings.ABOUT_INTRO}</p>
            <ul className="mt-6 space-y-2.5 text-sm text-white/80">
              {settings.SITE_ADDRESS && <li className="flex gap-3"><MapPin className="mt-0.5 size-4 shrink-0 text-accent-400" aria-hidden />{settings.SITE_ADDRESS}</li>}
              {settings.SITE_PHONE && <li className="flex gap-3"><Phone className="mt-0.5 size-4 shrink-0 text-accent-400" aria-hidden /><a href={'tel:' + settings.SITE_PHONE.replace(/\s/g, '')} className="hover:text-white">{settings.SITE_PHONE}</a></li>}
              {settings.SITE_EMAIL && <li className="flex gap-3"><Mail className="mt-0.5 size-4 shrink-0 text-accent-400" aria-hidden /><a href={'mailto:' + settings.SITE_EMAIL} className="hover:text-white">{settings.SITE_EMAIL}</a></li>}
            </ul>
            <SocialIcons settings={settings} light className="mt-6" />
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {cols.map((c) => (
              <div key={c.title}>
                <h2 className="font-display text-sm font-bold uppercase tracking-[0.2em] text-accent-400">{c.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map(([label, href]) => (
                    <li key={href}><Link href={href!} className="text-sm text-white/70 transition hover:text-white">{label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-14 flex flex-col gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {settings.SITE_NAME}. All rights reserved.</p>
          <p className="flex gap-4"><Link href="/privacy" className="hover:text-white">Privacy Policy</Link><Link href="/terms" className="hover:text-white">Terms &amp; Conditions</Link></p>
        </div>
      </div>
    </footer>
  );
}
