import { act, renderHook, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { useAxios } from "./useAxios";

// A fake network: it answers with
// the URL after 50 ms, or rejects
// when its signal aborts.
const signals = vi.hoisted(() => [] as AbortSignal[]);
vi.mock("./getWithRetry", () => ({
  getWithRetry: (url: string, { signal }: { signal: AbortSignal }) => {
    signals.push(signal);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => resolve(url), 50);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(signal.reason);
      });
    });
  },
}));

test("a refetch keeps the old data and cancels the one before", async () => {
  const url = "/api/forecast";
  const { result } = renderHook(() => useAxios<string>(url), {
    reactStrictMode: true,
  });
  const now = () => result.current;
  await act(async () => {});
  // Strict Mode ran the effect
  // twice and canceled the first
  // request; the second is still
  // pending.
  expect(signals.map((s) => s.aborted)).toEqual([true, false]);
  expect(now().loading).toBe(true);
  expect(now().error).toBeNull();
  await waitFor(() => expect(now().data).toBe(url));

  signals.length = 0;
  act(() => now().fetchData());
  act(() => now().fetchData());
  expect(now().loading).toBe(true);
  expect(now().data).toBe(url);
  await waitFor(() =>
    expect(now().loading).toBe(false),
  );
  expect(signals.map((s) => s.aborted)).toEqual([true, false]);
});
