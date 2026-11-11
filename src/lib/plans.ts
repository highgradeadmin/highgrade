// Family plan prices as shown in the app. Stripe holds the real prices (scripts/stripe-setup.mjs);
// keep these two in sync when prices change.
export const PLAN_DISPLAY = {
  month: { price: "$4.99", cents: 499, per: "per month" },
  year: { price: "$42.99", cents: 4299, per: "per year" },
} as const;

/** Yearly saving vs. paying monthly for 12 months, e.g. "Save 28%". */
export const YEARLY_SAVING = `Save ${Math.round((1 - PLAN_DISPLAY.year.cents / (PLAN_DISPLAY.month.cents * 12)) * 100)}%`;

/**
 * Free beta: no paid plans are offered. Every family gets FREE_TRIES coach feedback tries
 * (counted per email in the database, see supabase/migrations/0011), and the subscribe
 * options are hidden. Set to false to bring the family plan back (Stripe code is unchanged).
 */
export const FREE_BETA = true;
/** Free tries per family. Must match free_tries_left() in the latest migration. */
export const FREE_TRIES = 100;
