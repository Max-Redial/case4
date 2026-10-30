import assert from "node:assert/strict";
import { test } from "node:test";
import { createApp } from "./app.js";

const app = createApp({ apiKey: "k", slowMs: 50 });
const get = (path: string, key: string | null = "k") =>
  app.request(path, { headers: key ? { authorization: `Bearer ${key}` } : {} });

test("repairs need the bearer key", async () => {
  assert.equal((await get("/repairs/RPR-2001", null)).status, 401);
  assert.equal((await get("/repairs/RPR-2001", "wrong")).status, 401);
});

test("ready repair is ready_for_pickup with a balance", async () => {
  const body = await (await get("/repairs/RPR-2001")).json();
  assert.equal(body.status, "ready_for_pickup");
  assert.equal(body.balance_due, 412.5);
});

test("awaiting parts names the part and its ETA", async () => {
  const body = await (await get("/repairs/RPR-2002")).json();
  assert.equal(body.status, "awaiting_parts");
  assert.ok(body.awaiting_part);
  assert.ok(body.parts_eta);
});

test("refs are forgiving: bare digits, lower case, spaces", async () => {
  for (const raw of ["2001", "rpr-2001", "rpr%202001"]) {
    assert.equal((await get(`/repairs/${raw}`)).status, 200, raw);
  }
});

test("unknown and RPR-404 are 404, RPR-503 is 503 with retry-after", async () => {
  assert.equal((await get("/repairs/RPR-9999")).status, 404);
  assert.equal((await get("/repairs/RPR-404")).status, 404);
  const down = await get("/repairs/RPR-503");
  assert.equal(down.status, 503);
  assert.equal(down.headers.get("retry-after"), "30");
});

test("RPR-SLOW answers only after the delay", async () => {
  const started = Date.now();
  assert.equal((await get("/repairs/RPR-SLOW")).status, 200);
  assert.ok(Date.now() - started >= 50);
});
