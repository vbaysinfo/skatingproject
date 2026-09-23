'use client';
import { useEffect, useRef, useState } from 'react';

type GoogleId = {
  accounts: { id: { initialize: (o: Record<string, unknown>) => void; renderButton: (el: HTMLElement, o: Record<string, unknown>) => void } };
};
declare global { interface Window { google?: GoogleId } }

/** Google Identity Services button. The ID token is verified by Apps Script, never trusted here. */
export function GoogleSignIn({ clientId, onCredential, text = 'signin_with' }: { clientId: string; onCredential: (credential: string) => void; text?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const cb = useRef(onCredential);
  const [failed, setFailed] = useState(false);
  useEffect(() => { cb.current = onCredential; }, [onCredential]);

  useEffect(() => {
    if (!clientId) return;
    const init = () => {
      if (!window.google || !ref.current) return;
      window.google.accounts.id.initialize({ client_id: clientId, callback: (r: { credential: string }) => cb.current(r.credential), ux_mode: 'popup' });
      window.google.accounts.id.renderButton(ref.current, { theme: 'outline', size: 'large', shape: 'pill', text, width: 320 });
    };
    if (window.google) { init(); return; }
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = init;
    s.onerror = () => setFailed(true);
    document.head.appendChild(s);
  }, [clientId, text]);

  if (!clientId || failed) return null;
  return <div ref={ref} className="flex min-h-11 justify-center" />;
}
