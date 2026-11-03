// Crea en Stripe los productos y precios de TurboCita (idempotente, usa lookup_key).
// Uso: STRIPE_SECRET_KEY=sk_test_... npm run stripe:setup
import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("Falta STRIPE_SECRET_KEY");
  process.exit(1);
}
const stripe = new Stripe(key);

// Precios en céntimos de euro. El anual equivale a -20 % sobre 12 mensualidades.
const PLANS = [
  { id: "starter", name: "TurboCita Starter", month: 1900, year: 18000 },
  { id: "growth", name: "TurboCita Growth", month: 3900, year: 37200 },
  { id: "pro", name: "TurboCita Pro (por sede)", month: 7900, year: 75600 },
];

for (const p of PLANS) {
  const existing = await stripe.products.search({ query: `metadata['turbocita_plan']:'${p.id}' AND active:'true'`, limit: 1 });
  const product = existing.data[0] ?? await stripe.products.create({ name: p.name, metadata: { turbocita_plan: p.id } });

  for (const [interval, amount] of [["month", p.month], ["year", p.year]]) {
    const lookup_key = `turbocita_${p.id}_${interval}`;
    const found = await stripe.prices.list({ lookup_keys: [lookup_key], active: true, limit: 1 });
    if (found.data[0]) {
      console.log(`= ${lookup_key} ya existe (${found.data[0].id})`);
      continue;
    }
    const price = await stripe.prices.create({
      product: product.id, currency: "eur", unit_amount: amount, lookup_key, recurring: { interval },
    });
    console.log(`+ ${lookup_key} creado (${price.id})`);
  }
}
console.log("\nListo. Activa el portal de clientes en Stripe → Ajustes → Billing → Portal de clientes.");
