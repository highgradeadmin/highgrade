// Family plan prices as shown in the app. Stripe holds the real prices (scripts/stripe-setup.mjs);
// keep these two in sync when prices change.
export const PLAN_DISPLAY = {
  month: { price: "$4.99", cents: 499, per: "per month" },
  year: { price: "$42.99", cents: 4299, per: "per year" },
} as const;

/** Yearly saving vs. paying monthly for 12 months, e.g. "Save 28%". */
export const YEARLY_SAVING = `Save ${Math.round((1 - PLAN_DISPLAY.year.cents / (PLAN_DISPLAY.month.cents * 12)) * 100)}%`;
