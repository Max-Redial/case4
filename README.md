# case4

A fake store order API, for testing the "Retail order and returns assistant" job (case 4). The job's HTTP Request step calls it; the knowledge-base policy is `docs/return-policy.md`.

The step only reaches public addresses over `https`, so host this somewhere it can be reached (a tunnel, Fly, Render, a VPS behind TLS). `localhost` and `http://` are refused.

## Run

```bash
npm install
cp .env.example .env   # then edit; or just export the variables
API_KEY=case4-dev-key npm run start:ts   # from source; or: npm run build && npm start
npm test
```

| Variable  | Default          |                                                       |
| --------- | ---------------- | ----------------------------------------------------- |
| `API_KEY` | unset (auth off) | Bearer key required on `/orders/*`                    |
| `PORT`    | 3000             |                                                       |
| `SLOW_MS` | 20000            | Delay for `ORD-SLOW`; the HTTP step gives up at 15000 |

## Deploy on Coolify

New resource → this Git repo → build pack **Dockerfile**. Then:

- Ports Exposes: `3000`.
- Environment variables: `API_KEY` (a long random string; the job's secret holds the same value). `SLOW_MS` is optional.
- Domain: Coolify's proxy issues the https certificate; the job's URL is `https://<that domain>/orders/{{order_id}}`.
- The image has a healthcheck on `/health`, which needs no key.
- Check it from outside: `curl https://<domain>/health`, then `curl -H "Authorization: Bearer <key>" https://<domain>/orders/1001`.

## API

`GET /health` answers `{"ok":true}` with no key.

`GET /orders/:id` with `Authorization: Bearer <API_KEY>`. The id is forgiving: `1001`, `ord-1001` and `ORD-1001` are the same order. The API returns facts only (`status`, `days_since_delivery` as a number, items, total, payment method); whether an item can be returned is the policy's call.

| Order                     | Answers                                              | Scenario                                 |
| ------------------------- | ---------------------------------------------------- | ---------------------------------------- |
| `ORD-1001`                | 200, delivered 5 days ago, a jacket                  | Eligible return                          |
| `ORD-1002`                | 200, delivered 45 days ago, boots                    | Outside the 30-day window                |
| `ORD-1003`                | 200, `in_transit`, no delivery date                  | Not delivered yet; no invented status    |
| `ORD-1004`                | 200, delivered 10 days ago, a gift card and a jacket | The policy says nothing about gift cards |
| `ORD-1005`                | 200, delivered 30 days ago                           | Last day of the window                   |
| `ORD-404`, any unknown id | 404 `not_found`                                      | Order not found                          |
| `ORD-503`                 | 503 `service_unavailable`, `Retry-After: 30`         | API unavailable                          |
| `ORD-SLOW`                | 200 after `SLOW_MS`                                  | The HTTP step times out                  |
| wrong or missing key      | 401 `unauthorized`                                   | Secret header check                      |

### Repairs (auto repair status case)

`GET /repairs/:ref`, same bearer key. The ref is forgiving: `2001`, `rpr-2001` and `RPR-2001` are the same repair. Facts only (`status`, vehicle, work, dates, part, balance, pickup hours); what to say and whether to offer a callback is the job's call.

| Repair                     | Answers                                           | Scenario                 |
| -------------------------- | ------------------------------------------------- | ------------------------ |
| `RPR-2001`                 | 200, `ready_for_pickup`, balance due 412.50       | Repair ready             |
| `RPR-2002`                 | 200, `awaiting_parts`, part and `parts_eta`       | Awaiting parts           |
| `RPR-2003`                 | 200, `in_progress`, estimated completion tomorrow | In the shop              |
| `RPR-404`, any unknown ref | 404 `not_found`                                   | Unknown repair reference |
| `RPR-503`                  | 503 `service_unavailable`, `Retry-After: 30`      | API unavailable          |
| `RPR-SLOW`                 | 200 after `SLOW_MS`                               | The HTTP step times out  |

## In the job

- Create a secret (Settings → Secrets) holding the key; the HTTP step's header is `Authorization: Bearer {{secret.<name>}}`.
- URL `https://<your-host>/orders/{{order_id}}`, method GET. Name the `status` and `body` response parts as variables.
- Branch on `status`: 200 explains the order, 404 asks again or transfers, anything else (including empty, when the request never completed) says the order system is unavailable and transfers.
- The server logs every request (method, path, status, time) so you can confirm what the job sent. The key is never logged.
