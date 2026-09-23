import Link from 'next/link';
import { buttonClass } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <main id="main" className="grid min-h-dvh place-items-center bg-ink px-4 text-center text-white">
      <div>
        <p className="font-display text-[8rem] font-extrabold leading-none text-accent-500">404</p>
        <h1 className="font-display text-4xl font-extrabold uppercase">Off the track</h1>
        <p className="mt-2 text-white/70">The page you are looking for doesn&apos;t exist or has moved.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href="/" className={buttonClass('accent', 'lg')}>Go home</Link>
          <Link href="/events" className={buttonClass('outline-light', 'lg')}>View events</Link>
        </div>
      </div>
    </main>
  );
}
