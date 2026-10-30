import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "./app.js";

const app = createApp({ apiKey: "k", slowMs: 50 });
const get = (path: string, key: string | null = "k") =>
  app.request(path, { headers: key ? { authorization: `Bearer ${key}` } : {} });

test("health needs no key", async () => {
  assert.equal((await get("/health", null)).status, 200);
});

test("orders need the bearer key", async () => {
  assert.equal((await get("/orders/ORD-1001", null)).status, 401);
  assert.equal((await get("/orders/ORD-1001", "wrong")).status, 401);
});

test("eligible, outside the window and boundary orders carry a number of days", async () => {
  for (const [id, days] of [["ORD-1001", 5], ["ORD-1002", 45], ["ORD-1005", 30]] as const) {
    const body = await (await get(`/orders/${id}`)).json();
    assert.equal(body.status, "delivered");
    assert.equal(body.days_since_delivery, days);
  }
});

test("in transit has no delivery date", async () => {
  const body = await (await get("/orders/ORD-1003")).json();
  assert.equal(body.status, "in_transit");
  assert.equal(body.days_since_delivery, null);
  assert.equal(body.delivered_at, null);
});

test("the gift card order lists a gift_card item", async () => {
  const body = await (await get("/orders/ORD-1004")).json();
  assert.ok(body.items.some((i: { category: string }) => i.category === "gift_card"));
});

test("ids are forgiving: bare digits, lower case, spaces", async () => {
  for (const raw of ["1001", "ord-1001", "ord%201001"]) {
    assert.equal((await get(`/orders/${raw}`)).status, 200, raw);
  }
});

test("unknown and ORD-404 are 404, ORD-503 is 503 with retry-after", async () => {
  assert.equal((await get("/orders/ORD-9999")).status, 404);
  assert.equal((await get("/orders/ORD-404")).status, 404);
  const down = await get("/orders/ORD-503");
  assert.equal(down.status, 503);
  assert.equal(down.headers.get("retry-after"), "30");
});

test("ORD-SLOW answers only after the delay", async () => {
  const started = Date.now();
  assert.equal((await get("/orders/ORD-SLOW")).status, 200);
  assert.ok(Date.now() - started >= 50);
});
