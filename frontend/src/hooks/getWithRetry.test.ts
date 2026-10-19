// @vitest-environment node
import axios from "axios";
import { afterAll, afterEach, beforeAll, expect, test, vi } from "vitest";
import { startTestServer, wait, type TestServer } from "../test/testServer";
import { getWithRetry } from "./getWithRetry";

// Real Axios against a real local server, in Node.
let server: TestServer;
beforeAll(async () => {
  server = await startTestServer();
});
afterEach(() => {
  server.reset();
  vi.restoreAllMocks();
});
afterAll(() => server.close());

const signal = () => new AbortController().signal;

test("returns the data once a retry succeeds", async () => {
  server.reply("/flaky", (n) =>
    n <= 2 ? { status: 503 } : { status: 200, body: "ok" },
  );
  const data = await getWithRetry<string>(server.url("/flaky"), {
    retries: 3,
    delay: 10,
    timeout: 1000,
    signal: signal(),
  });
  expect(data).toBe("ok");
  expect(server.log.map((r) => r.status)).toEqual([503, 503, 200]);
});

test("retries counts the retries after the first attempt", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0);
  server.reply("/down", () => ({ status: 503 }));
  const error = await getWithRetry(server.url("/down"), {
    retries: 5,
    delay: 10,
    timeout: 1000,
    signal: signal(),
  }).catch((err: unknown) => err);
  expect(axios.isAxiosError(error) && error.response?.status).toBe(503);
  expect(server.log).toHaveLength(6);
});

test.each([400, 404, 501])("does not retry a %i", async (status) => {
  server.reply("/no", () => ({ status }));
  const error = await getWithRetry(server.url("/no"), {
    retries: 3,
    delay: 10,
    timeout: 1000,
    signal: signal(),
  }).catch((err: unknown) => err);
  expect(axios.isAxiosError(error) && error.response?.status).toBe(status);
  expect(server.log).toHaveLength(1);
});

test("a timeout ends a request that never gets an answer", async () => {
  server.reply("/hang", () => "hang");
  const error = await getWithRetry(server.url("/hang"), {
    retries: 3,
    delay: 10,
    timeout: 200,
    signal: signal(),
  }).catch((err: unknown) => err);
  expect(axios.isAxiosError(error) && error.code).toBe("ECONNABORTED");
  // A timeout has no status, so it is not retried.
  expect(server.log).toHaveLength(1);
});

test("an abort during the backoff stops the retries at once", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  server.reply("/down", () => ({ status: 503 }));
  const controller = new AbortController();
  const pending = getWithRetry(server.url("/down"), {
    retries: 3,
    delay: 10_000,
    timeout: 1000,
    signal: controller.signal,
  }).catch((err: unknown) => err);
  // The first attempt fails; the retry would wait 5 seconds.
  await vi.waitFor(() => expect(server.log[0]?.outcome).toBe("answered"));
  const aborted = Date.now();
  controller.abort();
  const error = await pending;
  expect(Date.now() - aborted).toBeLessThan(500);
  expect((error as Error).name).toBe("AbortError");
  await wait(100);
  expect(server.log).toHaveLength(1);
});

test("an abort during a request cancels it", async () => {
  server.reply("/slow", () => ({ status: 200, body: "late", delay: 500 }));
  const controller = new AbortController();
  const pending = getWithRetry(server.url("/slow"), {
    retries: 3,
    delay: 10,
    timeout: 1000,
    signal: controller.signal,
  }).catch((err: unknown) => err);
  await vi.waitFor(() => expect(server.log).toHaveLength(1));
  controller.abort();
  expect(axios.isCancel(await pending)).toBe(true);
  await vi.waitFor(() => expect(server.log[0].outcome).toBe("abandoned"));
});

test("full jitter: each wait is random, below a ceiling that doubles", async () => {
  server.reply("/down", () => ({ status: 503 }));
  const options = { retries: 3, timeout: 1000, signal: signal() };

  // Math.random() near 1: the waits come close to 30, 60, and 120 ms.
  vi.spyOn(Math, "random").mockReturnValue(0.999);
  await getWithRetry(server.url("/down"), { ...options, delay: 30 }).catch(
    () => {},
  );
  const gaps = server.log.slice(1).map((r, i) => r.at - server.log[i].at);
  expect(gaps).toHaveLength(3);
  [30, 60, 120].forEach((ceiling, i) =>
    expect(gaps[i]).toBeGreaterThanOrEqual(ceiling - 5),
  );

  // Math.random() at 0: no waits, even with a 1-second base delay.
  server.reset();
  server.reply("/down", () => ({ status: 503 }));
  vi.spyOn(Math, "random").mockReturnValue(0);
  const started = Date.now();
  await getWithRetry(server.url("/down"), { ...options, delay: 1000 }).catch(
    () => {},
  );
  expect(server.log).toHaveLength(4);
  expect(Date.now() - started).toBeLessThan(1000);
});
