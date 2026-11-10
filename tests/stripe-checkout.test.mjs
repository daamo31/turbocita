import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import ts from "typescript";

test("el checkout de suscripciones usa pagos estándar aunque Managed Payments sea el predeterminado", async () => {
  const filename = path.resolve("src/app/(admin)/dashboard/plan/actions.ts");
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const redirectSignal = new Error("redirect");
  let checkoutParams;
  let redirectUrl;
  const stripe = {
    checkout: { sessions: { create: async (params) => {
      checkoutParams = params;
      return { url: "https://checkout.stripe.com/test" };
    } } },
  };
  const admin = {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: { stripe_customer_id: "cus_test", stripe_subscription_id: null } }),
        }),
      }),
    }),
  };
  const mocks = {
    "next/headers": { headers: async () => new Headers() },
    "next/navigation": { redirect: (url) => { redirectUrl = url; throw redirectSignal; } },
    "@/lib/auth": { getBillingContext: async () => ({ business: { id: "business", name: "Test" }, user: {}, role: "owner" }) },
    "@/lib/supabase/admin": { createAdminClient: () => admin },
    "@/lib/stripe": {
      getStripe: () => stripe,
      priceIdFor: async () => "price_test",
      siteUrl: () => "https://example.com",
      stripeConfigured: () => true,
    },
  };
  const originalLoad = Module._load;
  const mod = new Module(filename);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  try {
    Module._load = function (request, parent, isMain) {
      return Object.hasOwn(mocks, request) ? mocks[request] : originalLoad.call(this, request, parent, isMain);
    };
    mod._compile(source, filename);
  } finally {
    Module._load = originalLoad;
  }
  const form = new FormData();
  form.set("plan", "growth");
  form.set("interval", "month");
  await assert.rejects(mod.exports.startCheckout(form), (error) => error === redirectSignal);
  assert.equal(redirectUrl, "https://checkout.stripe.com/test");
  assert.equal(checkoutParams.mode, "subscription");
  assert.deepEqual(checkoutParams.managed_payments, { enabled: false });
  assert.deepEqual(checkoutParams.line_items, [{ price: "price_test", quantity: 1 }]);
  assert.equal(checkoutParams.subscription_data, undefined);
});
