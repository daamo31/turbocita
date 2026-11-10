import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import ts from "typescript";

function loadWebhook({ status, updateError = null }) {
  const filename = path.resolve("src/app/api/stripe/webhook/route.ts");
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const subscription = {
    id: "sub_test", status, customer: "cus_test", trial_end: null,
    items: { data: [{ price: { lookup_key: "turbocita_growth_month" } }] },
  };
  let saved;
  let retrieved = false;
  const admin = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "business", stripe_subscription_id: null } }) }) }),
      update: (value) => ({ eq: async () => { saved = value; return { error: updateError }; } }),
    }),
  };
  const mocks = {
    "next/server": { NextResponse: Response },
    "@/lib/supabase/admin": { createAdminClient: () => admin },
    "@/lib/stripe": {
      getStripe: () => ({
        webhooks: { constructEvent: () => ({ type: "customer.subscription.updated", data: { object: { id: "sub_test" } } }) },
        subscriptions: { retrieve: async () => { retrieved = true; return subscription; } },
      }),
      mapStatus: (value) => value === "incomplete" ? "past_due" : value,
      planFromLookupKey: () => ({ plan: "growth", interval: "month" }),
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
  return { post: mod.exports.POST, saved: () => saved, retrieved: () => retrieved };
}

for (const status of ["active", "past_due", "incomplete", "canceled"]) {
  test(`el webhook sincroniza ${status} y termina la prueba solo cuando corresponde`, async () => {
    const old = process.env.STRIPE_WEBHOOK_SECRET;
    process.env.STRIPE_WEBHOOK_SECRET = "test";
    try {
      const webhook = loadWebhook({ status });
      const response = await webhook.post(new Request("https://example.com", {
        method: "POST", headers: { "stripe-signature": "test" }, body: "{}",
      }));
      assert.equal(response.status, 200);
      assert.equal(webhook.retrieved(), true);
      assert.equal(webhook.saved().plan, "growth");
      assert.equal("app_trial_ends_at" in webhook.saved(), status === "active" || status === "past_due");
    } finally {
      if (old === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
      else process.env.STRIPE_WEBHOOK_SECRET = old;
    }
  });
}

test("el webhook devuelve 500 cuando falla la escritura para que Stripe reintente", async () => {
  const old = process.env.STRIPE_WEBHOOK_SECRET;
  const log = console.error;
  process.env.STRIPE_WEBHOOK_SECRET = "test";
  console.error = () => {};
  try {
    const webhook = loadWebhook({ status: "active", updateError: new Error("database error") });
    const response = await webhook.post(new Request("https://example.com", {
      method: "POST", headers: { "stripe-signature": "test" }, body: "{}",
    }));
    assert.equal(response.status, 500);
  } finally {
    console.error = log;
    if (old === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = old;
  }
});
