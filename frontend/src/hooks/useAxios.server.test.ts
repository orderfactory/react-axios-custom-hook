import { act, renderHook, waitFor } from "@testing-library/react";
import axios from "axios";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { startTestServer, wait, type TestServer } from "../test/testServer";
import { useAxios } from "./useAxios";

// The sequences that broke the original hook, run against
// a local server with the real getWithRetry and Axios.
let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterEach(() => {
  server.reset();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const answers = () => server.log.map((r) => `${r.path} ${r.outcome}`);

test("two quick calls keep loading until the second answer", async () => {
  server.reply("/a", () => ({ status: 200, body: "A", delay: 100 }));
  const { result } = renderHook(() =>
    useAxios<string>(server.url("/a"), { autoFetch: false }),
  );
  act(() => result.current.fetchData());
  await waitFor(() => expect(server.log).toHaveLength(1));
  act(() => result.current.fetchData());
  await wait(60);
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.data).toBe("A"));
  expect(result.current.loading).toBe(false);
  expect(answers()).toEqual(["/a abandoned", "/a answered"]);
});

test("a new URL during a backoff stops the old retries", async () => {
  // Each retry waits half its ceiling: 200 ms for the first.
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  server.reply("/a", () => ({ status: 503 }));
  server.reply("/b", () => ({ status: 200, body: "B" }));
  const { result, rerender } = renderHook(
    ({ url }) => useAxios<string>(url, { delay: 400 }),
    { initialProps: { url: server.url("/a") } },
  );
  await waitFor(() => expect(server.log[0]?.status).toBe(503));
  rerender({ url: server.url("/b") });
  await waitFor(() => expect(result.current.data).toBe("B"));
  await wait(400);
  expect(result.current.data).toBe("B");
  expect(server.log.map((r) => `${r.path} ${r.status}`)).toEqual([
    "/a 503",
    "/b 200",
  ]);
});

test("switching URLs clears the old data at once", async () => {
  server.reply("/a", () => ({ status: 200, body: "A" }));
  server.reply("/b", () => ({ status: 200, body: "B", delay: 50 }));
  const { result, rerender } = renderHook(
    ({ url }) => useAxios<string>(url),
    { initialProps: { url: server.url("/a") } },
  );
  await waitFor(() => expect(result.current.data).toBe("A"));
  rerender({ url: server.url("/b") });
  expect(result.current.data).toBeNull();
  expect(result.current.loading).toBe(true);
  await waitFor(() => expect(result.current.data).toBe("B"));
});

test("an unmount aborts the request in flight, and no retry follows", async () => {
  server.reply("/a", () => ({ status: 503, delay: 200 }));
  const { unmount } = renderHook(() =>
    useAxios(server.url("/a"), { delay: 1 }),
  );
  await waitFor(() => expect(server.log).toHaveLength(1));
  unmount();
  await wait(400);
  expect(answers()).toEqual(["/a abandoned"]);
});

test("a server that never answers ends in a timeout error", async () => {
  server.reply("/hang", () => "hang");
  const { result } = renderHook(() =>
    useAxios(server.url("/hang"), { timeout: 200 }),
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  const { error } = result.current;
  expect(axios.isAxiosError(error) && error.code).toBe("ECONNABORTED");
  expect(server.log).toHaveLength(1);
});

test("retries: 5 allows six attempts, then reports the status", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  server.reply("/down", () => ({ status: 503 }));
  const { result } = renderHook(() =>
    useAxios(server.url("/down"), { retries: 5 }),
  );
  await waitFor(() => expect(result.current.loading).toBe(false));
  const { error } = result.current;
  expect(axios.isAxiosError(error) && error.response?.status).toBe(503);
  expect(result.current.data).toBeNull();
  expect(server.log).toHaveLength(6);
});

test("changing an option after a success shows loading again", async () => {
  server.reply("/a", () => ({ status: 200, body: "A", delay: 50 }));
  const { result, rerender } = renderHook(
    ({ retries }) => useAxios<string>(server.url("/a"), { retries }),
    { initialProps: { retries: 1 } },
  );
  await waitFor(() => expect(result.current.data).toBe("A"));
  expect(result.current.loading).toBe(false);
  rerender({ retries: 2 });
  expect(result.current.loading).toBe(true);
  expect(result.current.data).toBe("A");
  await waitFor(() => expect(result.current.loading).toBe(false));
  expect(server.log).toHaveLength(2);
});

test("a failed refetch keeps the last good data next to the error", async () => {
  server.reply("/a", (n) => (n === 1 ? { status: 200, body: "A" } : { status: 503 }));
  const { result } = renderHook(() =>
    useAxios<string>(server.url("/a"), { retries: 0 }),
  );
  await waitFor(() => expect(result.current.data).toBe("A"));
  act(() => result.current.fetchData());
  await waitFor(() => expect(result.current.error).not.toBeNull());
  expect(result.current.data).toBe("A");
  expect(result.current.loading).toBe(false);
});

test("autoFetch: false waits for fetchData; then a new URL fetches on its own", async () => {
  server.reply("/a", () => ({ status: 200, body: "A" }));
  server.reply("/b", () => ({ status: 200, body: "B" }));
  const { result, rerender } = renderHook(
    ({ url }) => useAxios<string>(url, { autoFetch: false }),
    { initialProps: { url: server.url("/a") } },
  );
  await wait(50);
  expect(server.log).toHaveLength(0);
  expect(result.current.loading).toBe(false);
  act(() => result.current.fetchData());
  await waitFor(() => expect(result.current.data).toBe("A"));
  rerender({ url: server.url("/b") });
  await waitFor(() => expect(result.current.data).toBe("B"));
  expect(server.log.map((r) => r.path)).toEqual(["/a", "/b"]);
});

test("under Strict Mode, the server sees one request", async () => {
  server.reply("/a", () => ({ status: 200, body: "A" }));
  const { result } = renderHook(() => useAxios<string>(server.url("/a")), {
    reactStrictMode: true,
  });
  await waitFor(() => expect(result.current.data).toBe("A"));
  // The first effect run's request was canceled before it was sent.
  expect(server.log).toHaveLength(1);
});
