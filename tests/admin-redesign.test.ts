import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

const workspace = fileURLToPath(new URL("../", import.meta.url));
const source = (path: string) => readFileSync(new URL(path, `file:///${workspace.replace(/\\/g, "/")}`), "utf8");

test("admin shell exposes active, responsive and account navigation", () => {
  const shell = source("src/components/admin/admin-shell.tsx");
  const styles = source("src/app/admin/(secured)/admin.css");

  assert.match(shell, /usePathname\(\)/);
  assert.match(shell, /aria-current=\{active \? "page"/);
  assert.match(shell, /castelao-admin-sidebar/);
  assert.match(shell, /\/admin\/perfil/);
  assert.match(styles, /data-mobile-open/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});

test("profile password changes require the existing password", () => {
  const profile = source("src/components/admin/password-change-form.tsx");

  assert.match(profile, /current_password: currentPassword/);
  assert.match(profile, /autoComplete="current-password"/);
  assert.match(profile, /auth\.updateUser/);
  assert.doesNotMatch(profile, /service_role|SUPABASE_SECRET_KEY/);
});

test("admin routes use representative skeletons and explicit UI states", () => {
  const skeletons = source("src/components/admin/admin-skeletons.tsx");
  const analytics = source("src/app/admin/(secured)/analitica/page.tsx");
  const consultations = source("src/app/admin/(secured)/consultas/page.tsx");

  assert.match(skeletons, /admin-skeleton-chart/);
  assert.match(skeletons, /admin-skeleton-table/);
  assert.match(analytics, /Analítica aún no habilitada/);
  assert.match(consultations, /No hay resultados para este filtro/);
});

test("expected Server Action failures stay inside their forms", () => {
  const actions = source("src/app/admin/(secured)/actions.ts");
  const actionForm = source("src/components/admin/admin-action-form.tsx");

  assert.match(actions, /safeParse\(/);
  assert.match(actions, /return validationFailure/);
  assert.match(actions, /return operationFailure/);
  assert.match(actionForm, /useActionState\(/);
  assert.match(actionForm, /aria-live="assertive"/);
  assert.match(actionForm, /role="alert"/);
});

test("database security tests cover inactive staff and lateral privilege attempts", () => {
  const rlsTests = source("supabase/tests/admin_rls_test.sql");
  const planned = Number(rlsTests.match(/select plan\((\d+)\)/i)?.[1]);
  const assertions = rlsTests.match(/select\s+(?:is|lives_ok|throws_ok|results_eq)\s*\(/gi) ?? [];

  assert.equal(assertions.length, planned);
  assert.match(rlsTests, /inactive staff cannot create content/);
  assert.match(rlsTests, /editor cannot elevate their own role/);
  assert.match(rlsTests, /editor cannot forge a note author/);
  assert.match(rlsTests, /staff cannot forge another actor in audit events/);
  assert.match(rlsTests, /authenticated clients cannot execute the lower-level role helper directly/);
});

test("the sole superadmin cannot accidentally revoke their own access", () => {
  const actions = source("src/app/admin/(secured)/actions.ts");
  const users = source("src/app/admin/(secured)/usuarios/page.tsx");

  assert.match(actions, /parsed\.userId === admin\.user\.id/);
  assert.match(actions, /!parsed\.active \|\| parsed\.role !== "superadmin"/);
  assert.match(users, /Cuenta actual protegida contra auto-revocación/);
});

test("the pending migration preserves content visibility and the last superadmin", () => {
  const migration = source("supabase/migrations/20260929131909_harden_admin_role_and_content_read_policies.sql");

  assert.match(migration, /for select to anon/);
  assert.match(migration, /for select to authenticated/);
  assert.match(migration, /status = 'published'.*or \(select private\.is_active_staff\(\)\)/s);
  assert.match(migration, /security definer\s+set search_path = ''/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /revoke all on function private\.protect_last_active_superadmin\(\) from public, anon, authenticated, service_role/);
});
