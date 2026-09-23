'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ApiError } from './api';

const toApiError = (e: unknown) => (e instanceof ApiError ? e : new ApiError('ERROR', 'Something went wrong. Please try again.'));

/** Loads data from the central API service with loading / error / reload state. */
export function useApi<T>(loader: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  useLayoutEffect(() => { loaderRef.current = loader; });

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await loaderRef.current());
    } catch (e) {
      setError(toApiError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    Promise.resolve()
      .then(() => { if (alive) { setLoading(true); setError(null); } return loaderRef.current(); })
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(toApiError(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, reload, setData };
}
