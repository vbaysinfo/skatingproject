'use client';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

/** Never shows raw errors to users (spec §100). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  return (
    <main id="main" className="grid min-h-[70vh] place-items-center px-4 text-center">
      <div>
        <h1 className="font-display text-4xl font-extrabold uppercase">Something went wrong</h1>
        <p className="mt-2 text-muted">Something went wrong. Please try again.</p>
        <Button className="mt-6" onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
