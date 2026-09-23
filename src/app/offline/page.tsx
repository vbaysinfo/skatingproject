export const metadata = { title: 'Offline' };
export default function Offline() {
  return (
    <main className="grid min-h-dvh place-items-center bg-ink px-4 text-center text-white">
      <div>
        <p className="font-display text-5xl font-extrabold uppercase">You&apos;re offline</p>
        <p className="mt-3 text-white/70">Check your connection — the latest events and results will load when you&apos;re back online.</p>
      </div>
    </main>
  );
}
