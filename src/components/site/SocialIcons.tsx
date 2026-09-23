import type { Settings } from '@/lib/types';
import { cn } from '@/lib/format';

const ICONS: Record<string, { label: string; path: string }> = {
  FACEBOOK_URL: { label: 'Facebook', path: 'M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H7v4h2v9h4v-9h3l1-4h-4V9c0-.6.4-1 1-1Z' },
  INSTAGRAM_URL: { label: 'Instagram', path: 'M8 3h8a5 5 0 0 1 5 5v8a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5Zm4 5a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm5.5-1.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z' },
  YOUTUBE_URL: { label: 'YouTube', path: 'M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.3-1.3.4-2.5.4-3.8s-.1-2.5-.4-3.8ZM10 15V9l5.2 3L10 15Z' },
  WHATSAPP_URL: { label: 'WhatsApp', path: 'M12 2.5A9.5 9.5 0 0 0 3.8 16.8L2.5 21.5l4.8-1.3A9.5 9.5 0 1 0 12 2.5Zm5.3 13.4c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.9s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3Z' },
  X_URL: { label: 'X', path: 'M4 4h4.5l4 5.6L17 4h3l-6 7.3L21 20h-4.5l-4.4-6-5 6H4l6.6-7.9L4 4Z' },
};

export function SocialIcons({ settings, className, light }: { settings: Settings; className?: string; light?: boolean }) {
  const links = Object.keys(ICONS).filter((k) => settings[k]);
  if (!links.length) return null;
  return (
    <ul className={cn('flex flex-wrap gap-2', className)}>
      {links.map((k) => (
        <li key={k}>
          <a href={settings[k]} target="_blank" rel="noopener noreferrer" aria-label={ICONS[k]!.label}
            className={cn('grid size-10 place-items-center rounded-full transition', light ? 'bg-white/10 text-white hover:bg-accent-500' : 'bg-surface text-ink hover:bg-brand-600 hover:text-white')}>
            <svg viewBox="0 0 24 24" className="size-[18px]" fill="currentColor" aria-hidden><path d={ICONS[k]!.path} /></svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
