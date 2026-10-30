// Order facts only. Whether an item can be returned is the policy's call, not the API's.
export type Order = {
  order_id: string;
  status: "delivered" | "in_transit" | "processing";
  delivered_at: string | null;
  days_since_delivery: number | null;
  carrier?: string;
  estimated_delivery?: string;
  items: { sku: string; name: string; quantity: number; price: number; category: string }[];
  total: number;
  currency: "USD";
  payment_method: string;
};

const DAY = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * DAY).toISOString().slice(0, 10);
const ahead = (days: number) => new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

const delivered = (order_id: string, days: number, items: Order["items"], payment_method = "Visa ending 4242"): Order => ({
  order_id,
  status: "delivered",
  delivered_at: ago(days),
  days_since_delivery: days,
  items,
  total: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
  currency: "USD",
  payment_method,
});

const jacket = { sku: "JKT-210", name: "Trail rain jacket", quantity: 1, price: 89.0, category: "apparel" };
const boots = { sku: "BTS-044", name: "Leather work boots", quantity: 1, price: 129.5, category: "footwear" };
const giftCard = { sku: "GFT-050", name: "Gift card $50", quantity: 1, price: 50.0, category: "gift_card" };

// Order ids are looked up in upper case. ORD-404, ORD-503 and ORD-SLOW are handled in app.ts.
export const ORDERS: Record<string, () => Order> = {
  "ORD-1001": () => delivered("ORD-1001", 5, [jacket]), // eligible return
  "ORD-1002": () => delivered("ORD-1002", 45, [boots]), // outside the return window
  "ORD-1003": () => ({
    order_id: "ORD-1003",
    status: "in_transit",
    delivered_at: null,
    days_since_delivery: null,
    carrier: "UPS",
    estimated_delivery: ahead(2),
    items: [jacket],
    total: jacket.price,
    currency: "USD",
    payment_method: "Visa ending 4242",
  }),
  "ORD-1004": () => delivered("ORD-1004", 10, [giftCard, jacket]), // a gift card: the policy may not cover it
  "ORD-1005": () => delivered("ORD-1005", 30, [boots], "PayPal"), // last day of a 30-day window
};

// Callers say "1001", not "ORD-1001".
export function normalizeId(raw: string): string {
  const id = decodeURIComponent(raw).trim().toUpperCase().replace(/[\s_]+/g, "-");
  return /^\d+$/.test(id) ? `ORD-${id}` : id;
}
