// One-time Stripe setup: the Family Plan product, its two prices, and the customer portal.
// Safe to run again (it reuses what already exists). Run it once for test mode and once for live:
//   node --env-file=.env.local scripts/stripe-setup.mjs
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) throw new Error("Set STRIPE_SECRET_KEY first (in .env.local).");
const stripe = new Stripe(key);
console.log(`Stripe ${key.startsWith("sk_live_") ? "LIVE" : "test"} mode`);

const PRICES = [
  { lookup_key: "family_monthly", unit_amount: 999, interval: "month", nickname: "Family plan — monthly" },
  { lookup_key: "family_yearly", unit_amount: 7900, interval: "year", nickname: "Family plan — yearly" },
];

const existing = await stripe.prices.list({ lookup_keys: PRICES.map((p) => p.lookup_key), expand: ["data.product"] });
let product = existing.data[0]?.product;
if (!product || typeof product === "string" || product.deleted) {
  product = await stripe.products.create({
    name: "HighGrade Family Plan",
    description: "Writing lessons, daily prompts and coach feedback for your children.",
  });
  console.log("Created product", product.id);
} else {
  console.log("Using product", product.id);
}

const prices = [];
for (const p of PRICES) {
  let price = existing.data.find((x) => x.lookup_key === p.lookup_key);
  if (!price) {
    price = await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: p.unit_amount,
      recurring: { interval: p.interval },
      lookup_key: p.lookup_key,
      nickname: p.nickname,
    });
    console.log("Created price", p.lookup_key, price.id);
  } else {
    console.log("Using price", p.lookup_key, price.id);
  }
  prices.push(price);
}

// Customer portal: update card, see invoices, switch monthly/yearly, cancel at period end.
const configs = await stripe.billingPortal.configurations.list({ is_default: true, limit: 1 });
const features = {
  customer_update: { enabled: true, allowed_updates: ["email", "name"] },
  invoice_history: { enabled: true },
  payment_method_update: { enabled: true },
  subscription_cancel: { enabled: true, mode: "at_period_end" },
  subscription_update: {
    enabled: true,
    default_allowed_updates: ["price"],
    proration_behavior: "create_prorations",
    products: [{ product: product.id, prices: prices.map((p) => p.id) }],
  },
};
const business_profile = { headline: "HighGrade Writing — manage your family plan" };
if (configs.data[0]) {
  await stripe.billingPortal.configurations.update(configs.data[0].id, { features, business_profile });
  console.log("Updated customer portal", configs.data[0].id);
} else {
  const c = await stripe.billingPortal.configurations.create({ features, business_profile });
  console.log("Created customer portal", c.id);
}
console.log("Done.");
