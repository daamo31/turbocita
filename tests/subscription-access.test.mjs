import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import Module from "node:module";
import ts from "typescript";

function loadAuth({ allowed, accessError = null }) {
  const filename = path.resolve("src/lib/auth.ts");
  const source = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: "user" } } }) },
    from: () => ({ select: () => ({ eq: () => ({ limit: () => ({
      maybeSingle: async () => ({ data: { role: "owner", businesses: {
        id: "business", app_trial_ends_at: "2030-01-01T00:00:00Z",
      } } }),
    }) }) }) }),
    rpc: async (name) => name === "effective_plan"
      ? { data: "pro", error: null }
      : { data: allowed, error: accessError },
  };
  const redirect = new Error("redirect");
  const mocks = {
    "server-only": {},
    "react": { cache: (fn) => fn },
    "next/navigation": { redirect: (url) => { assert.equal(url, "/dashboard/plan"); throw redirect; } },
    "@/lib/supabase/server": { createClient: async () => supabase },
    "@/lib/plans": { parsePlan: (plan) => plan },
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
  return { ...mod.exports, redirect };
}

test("el panel permite acceder con prueba o suscripción activa", async () => {
  const auth = loadAuth({ allowed: true });
  assert.equal((await auth.getContext()).plan, "pro");
});

test("el panel bloquea el acceso vencido pero permite acceder a facturación", async () => {
  const auth = loadAuth({ allowed: false });
  assert.equal((await auth.getBillingContext()).hasAccess, false);
  await assert.rejects(auth.getContext(), (error) => error === auth.redirect);
});

test("un fallo al verificar el acceso no concede acceso", async () => {
  const auth = loadAuth({ allowed: null, accessError: new Error("database error") });
  const log = console.error;
  console.error = () => {};
  try {
    await assert.rejects(auth.getContext(), /No se pudo comprobar el acceso/);
  } finally {
    console.error = log;
  }
});
