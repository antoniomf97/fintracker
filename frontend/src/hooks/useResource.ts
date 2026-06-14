import { useCallback, useEffect, useState } from "react";

interface Resource<T> {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setError: (message: string | null) => void;
}

// Loads `fetcher` on mount and on demand, tracking loading/error state.
//
// The mount fetch writes state only from async callbacks (never synchronously in
// the effect body), so it can't trigger a cascading re-render, and a cancel flag
// drops results that arrive after unmount.
export function useResource<T>(
  fetcher: () => Promise<T>,
  initial: T,
): Resource<T> {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const runFetch = useCallback(
    (isCurrent: () => boolean) =>
      fetcher()
        .then((value) => {
          if (isCurrent()) setData(value);
        })
        .catch((err: Error) => {
          if (isCurrent()) setError(err.message);
        })
        .finally(() => {
          if (isCurrent()) setLoading(false);
        }),
    [fetcher],
  );

  useEffect(() => {
    let active = true;
    runFetch(() => active);
    return () => {
      active = false;
    };
  }, [runFetch]);

  const reload = useCallback(() => {
    setLoading(true);
    setError(null);
    runFetch(() => true);
  }, [runFetch]);

  return { data, loading, error, reload, setError };
}
