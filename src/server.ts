import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const apiKey = process.env.API_KEY;
if (!apiKey) console.warn("API_KEY is not set: /orders is open to anyone");

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: createApp({ apiKey, slowMs: Number(process.env.SLOW_MS ?? 20_000) }).fetch, port }, () =>
  console.log(`case4 orders API on :${port}`),
);
