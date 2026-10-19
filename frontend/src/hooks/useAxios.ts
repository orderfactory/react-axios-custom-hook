import { useCallback, useEffect, useState } from "react";
import { getWithRetry } from "./getWithRetry";

type Options = {
  retries?: number;
  delay?: number;
  timeout?: number;
  autoFetch?: boolean;
};

type Result<T> = {
  url: string;
  key: string;
  data: T | null;
  error: Error | null;
};

export function useAxios<T>(
  url: string,
  {
    retries = 3,
    delay = 1000,
    timeout = 10_000,
    autoFetch = true,
  }: Options = {},
) {
  // fetchData asks for a new run.
  const [run, setRun] = useState(0);
  const [result, setResult] = useState<Result<T> | null>(null);
  const active = autoFetch || run > 0;
  // Everything that starts a new
  // request, as one value.
  const key = JSON.stringify([url, run, retries, delay, timeout]);

  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    const { signal } = controller;
    getWithRetry<T>(url, { retries, delay, timeout, signal })
      .then((data) => {
        if (signal.aborted) return;
        setResult({ url, key, data, error: null });
      })
      .catch((error: unknown) => {
        if (signal.aborted) return;
        const err =
          error instanceof Error ? error : new Error(String(error));
        // Keep the last good data
        // for the same URL.
        setResult((last) => ({
          url,
          key,
          data: last?.url === url ? last.data : null,
          error: err,
        }));
      });
    // A new key or an unmount
    // cancels this request.
    return () => controller.abort();
  }, [active, key, url, retries, delay, timeout]);

  const fetchData = useCallback(() => setRun((n) => n + 1), []);

  // Data for this URL; loading
  // and error for this request.
  const current = result?.url === url ? result : null;
  const settled = current !== null && current.key === key;
  return {
    data: current?.data ?? null,
    error: settled ? current.error : null,
    loading: active && !settled,
    fetchData,
  };
}
