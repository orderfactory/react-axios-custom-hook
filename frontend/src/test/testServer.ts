import { createServer } from "node:http";
import type { AddressInfo } from "node:net";

// How the server answers one request: a status after an optional delay, or never.
export type Reply = { status: number; body?: unknown; delay?: number } | "hang";

export type LoggedRequest = {
  path: string;
  at: number;
  status?: number;
  outcome: "pending" | "answered" | "abandoned";
};

export type TestServer = {
  url: (path: string) => string;
  // The handler gets the request's number for its path, starting at 1.
  reply: (path: string, handler: (n: number) => Reply) => void;
  log: LoggedRequest[];
  reset: () => void;
  close: () => Promise<void>;
};

// A small local API for the tests. It delays, fails, or never answers on request,
// and it logs every request, including the ones the client gave up on.
export async function startTestServer(): Promise<TestServer> {
  const handlers = new Map<string, (n: number) => Reply>();
  const counts = new Map<string, number>();
  const log: LoggedRequest[] = [];

  const server = createServer((req, res) => {
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    const entry: LoggedRequest = { path, at: Date.now(), outcome: "pending" };
    log.push(entry);
    const n = (counts.get(path) ?? 0) + 1;
    counts.set(path, n);

    // A client that aborts closes the connection before the answer is sent.
    res.on("close", () => {
      if (!res.writableFinished) entry.outcome = "abandoned";
    });

    const reply = handlers.get(path)?.(n) ?? { status: 404 };
    if (reply === "hang") return;
    const send = () => {
      if (res.destroyed) return;
      entry.status = reply.status;
      entry.outcome = "answered";
      res.writeHead(reply.status, {
        "Content-Type": "application/json",
        // The hook tests run in jsdom, whose XMLHttpRequest enforces CORS.
        "Access-Control-Allow-Origin": "*",
      });
      res.end(JSON.stringify(reply.body ?? null));
    };
    if (reply.delay) setTimeout(send, reply.delay);
    else send();
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: (path) => `http://127.0.0.1:${port}${path}`,
    reply: (path, handler) => {
      handlers.set(path, handler);
    },
    log,
    reset: () => {
      handlers.clear();
      counts.clear();
      log.length = 0;
    },
    close: () =>
      new Promise((resolve, reject) => {
        server.closeAllConnections();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

export const wait = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));
