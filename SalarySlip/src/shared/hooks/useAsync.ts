import { useCallback, useEffect, useState } from "react";

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export interface AsyncResult<T> extends AsyncState<T> {
  refetch: () => void;
}

const toError = (e: unknown): Error =>
  e instanceof Error ? e : new Error(String(e));

interface Settled<T> {
  fetcher: unknown;
  nonce: number;
  data: T | null;
  error: Error | null;
}

/**
 * Runs `fetcher` on mount and whenever its identity changes, so wrap it in
 * useCallback.
 *
 * `loading` is derived by comparing the request that settled against the one
 * currently in flight, rather than being set from inside the effect — that
 * would cost an extra render pass on every fetch. Late responses from a
 * superseded fetcher are discarded.
 */
export function useAsync<T>(fetcher: () => Promise<T>): AsyncResult<T> {
  const [nonce, setNonce] = useState(0);
  const [settled, setSettled] = useState<Settled<T>>({
    fetcher: null,
    nonce: -1,
    data: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    fetcher().then(
      (data) => {
        if (!cancelled) setSettled({ fetcher, nonce, data, error: null });
      },
      (e: unknown) => {
        if (!cancelled)
          setSettled({ fetcher, nonce, data: null, error: toError(e) });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [fetcher, nonce]);

  useEffect(() => {
    const handleReconnected = () => {
      setNonce((n) => n + 1);
    };
    window.addEventListener("mongodb_reconnected", handleReconnected);
    return () => {
      window.removeEventListener("mongodb_reconnected", handleReconnected);
    };
  }, []);

  const isCurrent = settled.fetcher === fetcher && settled.nonce === nonce;
  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  return {
    data: isCurrent ? settled.data : null,
    loading: !isCurrent,
    error: isCurrent ? settled.error : null,
    refetch,
  };
}
