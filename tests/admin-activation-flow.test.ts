import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const workspace = fileURLToPath(new URL("../", import.meta.url));
const source = (path: string) => readFileSync(new URL(path, `file:///${workspace.replace(/\\/g, "/")}`), "utf8");

test("invitation tokens are exchanged server-side before the password form", () => {
  const route = source("src/app/auth/confirm/route.ts");
  const template = source("supabase/templates/admin-invite.html");
  const recoveryTemplate = source("supabase/templates/admin-recovery.html");

  assert.match(template, /\/auth\/confirm\?token_hash=\{\{ \.TokenHash \}\}&amp;type=invite/);
  assert.match(recoveryTemplate, /\/auth\/confirm\?token_hash=\{\{ \.TokenHash \}\}&amp;type=recovery/);
  assert.match(route, /type !== "invite" && type !== "recovery"/);
  assert.match(route, /auth\.verifyOtp\(\{ token_hash: tokenHash, type \}\)/);
  assert.match(route, /new URL\("\/admin\/activar", request\.url\)/);
  assert.match(route, /response\.cookies\.set/);
  assert.doesNotMatch(route, /searchParams\.set\("token_hash"/);
});

test("only an accepted invitation exposes the new-password form", () => {
  const proxy = source("src/proxy.ts");
  const activation = source("src/components/admin/admin-account-activation-form.tsx");
  const login = source("src/components/admin/admin-login-form.tsx");
  const actions = source("src/app/admin/(secured)/actions.ts");

  assert.match(proxy, /pathname === "\/admin\/login" \|\| pathname === "\/admin\/activar"/);
  assert.match(activation, /auth\.getUser\(\)/);
  assert.match(activation, /auth\.updateUser\(\{ password \}\)/);
  assert.match(activation, /password !== confirmation/);
  assert.match(login, /callbackType === "invite" \|\| callbackType === "recovery"/);
  assert.match(actions, /new URL\("\/admin\/login", siteConfig\.url\)/);
});
