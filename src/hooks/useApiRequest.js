import { useCallback, useEffect, useState } from 'react';

/**
 * Generic "call this API function, track loading/error/data" hook.
 * Every per-resource hook in this folder (useDashboard, useContacts,
 * ...) is a thin wrapper around this — edit this file if you want to
 * change fetching behavior (e.g. add retry, polling) everywhere at once.
 *
 * fetcher: () => Promise<T> — wrap it in useCallback at the call site
 * if it depends on props/state, so this hook knows when to re-run.
 */
export function useApiRequest(fetcher, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refetch = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    fetcher()
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => refetch(), [refetch]);

  return { data, loading, error, refetch };
}
