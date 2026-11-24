import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import test from "node:test";

const cases = [
  { name: "marked loopback QA permits HTTP assets for WebKit", qa: "true", site: "http://localhost:3450", db: "http://127.0.0.1:54421", upgrade: false },
  { name: "without QA flag keeps HTTPS upgrade", qa: "false", site: "http://localhost:3450", db: "http://127.0.0.1:54421", upgrade: true },
  { name: "remote site keeps HTTPS upgrade even with QA flag", qa: "true", site: "https://example.test", db: "http://127.0.0.1:54421", upgrade: true },
  { name: "remote database keeps HTTPS upgrade even with QA flag", qa: "true", site: "http://localhost:3450", db: "https://db.example.test", upgrade: true },
];

for (const item of cases) test(item.name, () => {
  const script = `import config from './next.config.ts'; const headers=await config.headers(); console.log(headers[0].headers.find(h=>h.key==='Content-Security-Policy').value);`;
  const policy = execFileSync(process.execPath, ["--experimental-strip-types", "--input-type=module", "-e", script], {
    cwd: new URL("../", import.meta.url), windowsHide: true, encoding: "utf8",
    env: { ...process.env, NODE_ENV: "production", CARE_LOCAL_QA: item.qa, NEXT_PUBLIC_SITE_URL: item.site, NEXT_PUBLIC_SUPABASE_URL: item.db },
  });
  assert.equal(policy.includes("upgrade-insecure-requests"), item.upgrade);
  assert.ok(policy.includes("object-src 'none'"));
  assert.ok(policy.includes("frame-ancestors 'none'"));
  assert.ok(!policy.includes("unsafe-eval"));
});
