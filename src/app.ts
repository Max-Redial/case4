import { Hono } from "hono";
import { ORDERS, normalizeId } from "./orders.js";

export type Config = { apiKey?: string; slowMs: number };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createApp({ apiKey, slowMs }: Config) {
  const app = new Hono();

  app.use("*", async (c, next) => {
    const started = Date.now();
    await next();
    console.log(`${new Date().toISOString()} ${c.req.method} ${c.req.path} -> ${c.res.status} ${Date.now() - started}ms`);
  });

  app.get("/health", (c) => c.json({ ok: true }));

  app.use("/orders/*", async (c, next) => {
    if (apiKey && c.req.header("authorization") !== `Bearer ${apiKey}`) {
      return c.json({ error: "unauthorized", message: "Missing or wrong bearer key" }, 401);
    }
    await next();
  });

  app.get("/orders/:id", async (c) => {
    const id = normalizeId(c.req.param("id"));

    if (id === "ORD-503") {
      return c.json({ error: "service_unavailable", message: "The order system is down" }, 503, { "retry-after": "30" });
    }
    if (id === "ORD-SLOW") {
      await sleep(slowMs);
      return c.json(ORDERS["ORD-1001"]!());
    }
    const order = ORDERS[id];
    if (!order) {
      return c.json({ error: "not_found", message: `No order ${id}` }, 404);
    }
    return c.json(order());
  });

  return app;
}
