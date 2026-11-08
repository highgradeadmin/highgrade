// Family plan prices as shown in the app. Stripe holds the real prices (scripts/stripe-setup.mjs);
// keep these two in sync when prices change.
export const PLAN_DISPLAY = {
  month: { price: "$7.99", cents: 799, per: "per month" },
  year: { price: "$69", cents: 6900, per: "per year" },
} as const;

/** Yearly saving vs. paying monthly for 12 months, e.g. "Save 28%". */
export const YEARLY_SAVING = `Save ${Math.round((1 - PLAN_DISPLAY.year.cents / (PLAN_DISPLAY.month.cents * 12)) * 100)}%`;
