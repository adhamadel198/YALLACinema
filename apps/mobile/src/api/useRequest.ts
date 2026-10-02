import { useCallback, useEffect, useState } from 'react';

/** Minimal fetch-state hook; swap for TanStack Query when caching and refetching matter. */
export function useRequest<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(() => load(), deps);

  const reload = useCallback(() => {
    let live = true;
    setLoading(true);
    setError(undefined);
    run()
      .then((d) => live && setData(d))
      .catch((e: Error) => live && setError(e.message))
      .finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [run]);

  useEffect(reload, [reload]);
  return { data, error, loading, reload };
}
