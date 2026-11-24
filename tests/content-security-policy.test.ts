import assert from "node:assert/strict";
import test from "node:test";

type HeaderConfig = {
  headers?: () => Promise<Array<{ headers: Array<{ key: string; value: string }> }>>;
};

async function contentSecurityPolicy(nodeEnv: "development" | "production", cacheKey: string) {
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;

  try {
    const configUrl = new URL("../next.config.ts", import.meta.url);
    configUrl.searchParams.set("environment", cacheKey);
    const { default: config } = await import(configUrl.href) as { default: HeaderConfig };
    const routes = await config.headers?.();
    const csp = routes?.[0]?.headers.find(({ key }) => key === "Content-Security-Policy")?.value;

    assert.ok(csp, "the global CSP header must be configured");
    return csp;
  } finally {
    if (previousNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = previousNodeEnv;
    }
  }
}

test("CSP supports React development diagnostics without weakening production", async () => {
  const developmentCsp = await contentSecurityPolicy("development", "development");
  const productionCsp = await contentSecurityPolicy("production", "production");

  assert.match(developmentCsp, /script-src[^;]*'unsafe-eval'/);
  assert.doesNotMatch(productionCsp, /script-src[^;]*'unsafe-eval'/);
});
