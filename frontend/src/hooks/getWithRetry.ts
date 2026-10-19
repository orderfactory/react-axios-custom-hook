import axios from "axios";

const RETRY_ON = new Set([500, 502, 503, 504]);

export type RetryOptions = {
  retries: number;
  delay: number;
  timeout: number;
  signal: AbortSignal;
};

// A plain function, not a Hook:
// it calls no Hooks, so it can
// run anywhere, tests included.
export async function getWithRetry<T>(
  url: string,
  { retries, delay, timeout, signal }: RetryOptions,
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      const response = await axios.get<T>(url, { signal, timeout });
      return response.data;
    } catch (err) {
      const status = axios.isAxiosError(err)
        ? err.response?.status
        : undefined;
      const retryable = status !== undefined && RETRY_ON.has(status);
      if (!retryable || attempt >= retries) throw err;
      // Full jitter: a random
      // wait below a ceiling
      // that doubles.
      const ceiling = delay * 2 ** attempt;
      await sleep(Math.random() * ceiling, signal);
    }
  }
}

// Waits ms, or rejects as soon
// as the signal aborts.
function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const onAbort = () => {
      clearTimeout(timer);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener(
        "abort",
        onAbort,
      );
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, {
      once: true,
    });
  });
}
