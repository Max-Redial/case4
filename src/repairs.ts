// Repair facts only. What to tell the customer, and whether to offer a callback, is the job's call.
export type Repair = {
  repair_ref: string;
  status: "in_progress" | "awaiting_parts" | "ready_for_pickup";
  vehicle: string;
  work: string;
  estimated_completion: string | null;
  ready_since: string | null;
  awaiting_part?: string;
  parts_eta?: string;
  balance_due: number | null;
  currency: "USD";
  pickup_hours: string;
};

const DAY = 86_400_000;
const ago = (days: number) =>
  new Date(Date.now() - days * DAY).toISOString().slice(0, 10);
const ahead = (days: number) =>
  new Date(Date.now() + days * DAY).toISOString().slice(0, 10);

const PICKUP_HOURS = "Mon-Fri 8:00-18:00, Sat 9:00-13:00";

// Repair refs are looked up in upper case. RPR-404, RPR-503 and RPR-SLOW are handled in app.ts.
export const REPAIRS: Record<string, () => Repair> = {
  "RPR-2001": () => ({
    repair_ref: "RPR-2001",
    status: "ready_for_pickup",
    vehicle: "2019 Honda Civic",
    work: "Front brake pads and rotors",
    estimated_completion: ago(1),
    ready_since: ago(1),
    balance_due: 412.5,
    currency: "USD",
    pickup_hours: PICKUP_HOURS,
  }),
  "RPR-2002": () => ({
    repair_ref: "RPR-2002",
    status: "awaiting_parts",
    vehicle: "2016 Ford F-150",
    work: "Replace alternator",
    estimated_completion: ahead(4),
    ready_since: null,
    awaiting_part: "Alternator, 150 amp",
    parts_eta: ahead(3),
    balance_due: null,
    currency: "USD",
    pickup_hours: PICKUP_HOURS,
  }),
  "RPR-2003": () => ({
    repair_ref: "RPR-2003",
    status: "in_progress",
    vehicle: "2021 Toyota RAV4",
    work: "Timing belt and water pump",
    estimated_completion: ahead(1),
    ready_since: null,
    balance_due: null,
    currency: "USD",
    pickup_hours: PICKUP_HOURS,
  }),
};

// Callers say "2001", not "RPR-2001".
export function normalizeRef(raw: string): string {
  const ref = decodeURIComponent(raw)
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "-");
  return /^\d+$/.test(ref) ? `RPR-${ref}` : ref;
}
