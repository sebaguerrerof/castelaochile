import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

type Pending = { resolve: (value: unknown) => void; reject: (error: Error) => void };

const DEBUG_PORT = process.env.CHROME_DEBUG_PORT ?? "9229";
const BASE_URL = process.env.BLOG_QA_BASE_URL ?? "http://localhost:3100";
let sequence = 0;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function openTarget() {
  const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: "PUT" });
  if (!response.ok) throw new Error(`Could not create Chrome target: HTTP ${response.status}`);
  return response.json() as Promise<{ id: string; webSocketDebuggerUrl: string }>;
}

async function closeTarget(id: string) {
  await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/close/${id}`);
}

async function inspectPage(path: string, viewport: { width: number; height: number; mobile: boolean }, keyboard = false) {
  const target = await openTarget();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  const pending = new Map<number, Pending>();
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  const events = new Map<string, Array<() => void>>();

  const ready = new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true });
    socket.addEventListener("error", () => reject(new Error("Chrome WebSocket failed.")), { once: true });
  });
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as { id?: number; method?: string; params?: Record<string, unknown>; result?: unknown; error?: { message: string } };
    if (message.id) {
      const request = pending.get(message.id);
      if (!request) return;
      pending.delete(message.id);
      if (message.error) request.reject(new Error(message.error.message));
      else request.resolve(message.result);
      return;
    }
    if (message.method === "Runtime.exceptionThrown") consoleErrors.push(JSON.stringify(message.params));
    if (message.method === "Log.entryAdded") {
      const entry = message.params?.entry as { level?: string; text?: string; url?: string } | undefined;
      if (entry?.level === "error") consoleErrors.push(`${entry.text ?? "Unknown log error"}${entry.url ? ` (${entry.url})` : ""}`);
    }
    if (message.method === "Network.loadingFailed") {
      const details = message.params as { blockedReason?: string; canceled?: boolean; errorText?: string } | undefined;
      if (!details?.canceled) failedRequests.push(details?.blockedReason ?? details?.errorText ?? "Unknown request failure");
    }
    for (const resolve of events.get(message.method ?? "") ?? []) resolve();
    events.delete(message.method ?? "");
  });

  async function send<T = Record<string, unknown>>(method: string, params: Record<string, unknown> = {}) {
    sequence += 1;
    const id = sequence;
    const response = new Promise<T>((resolve, reject) => pending.set(id, { resolve: resolve as (value: unknown) => void, reject }));
    socket.send(JSON.stringify({ id, method, params }));
    return response;
  }
  function waitFor(method: string, timeout = 15_000) {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), timeout);
      const callbacks = events.get(method) ?? [];
      callbacks.push(() => { clearTimeout(timer); resolve(); });
      events.set(method, callbacks);
    });
  }
  async function evaluate<T>(expression: string) {
    const response = await send<{ result: { value: T }; exceptionDetails?: unknown }>("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (response.exceptionDetails) throw new Error(`Browser evaluation failed: ${JSON.stringify(response.exceptionDetails)}`);
    return response.result.value;
  }

  try {
    await ready;
    await Promise.all([send("Page.enable"), send("Runtime.enable"), send("Network.enable"), send("Log.enable")]);
    await send("Emulation.setDeviceMetricsOverride", {
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: 1,
      mobile: viewport.mobile,
      screenWidth: viewport.width,
      screenHeight: viewport.height,
    });
    const loaded = waitFor("Page.loadEventFired");
    await send("Page.navigate", { url: `${BASE_URL}${path}` });
    await loaded;
    await new Promise((resolve) => setTimeout(resolve, 1_500));

    const metrics = await evaluate<{
      title: string; h1: string; total: string; cards: number; brokenImages: string[];
      innerWidth: number; scrollWidth: number; horizontalOverflow: boolean; articleBody: boolean;
      articleCover: boolean; jsonLd: boolean; canonical: string | null; searchValue: string | null;
      currentPage: string | null;
    }>(`(() => ({
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim() ?? '',
      total: document.querySelector('.blog-results-summary')?.textContent?.replace(/\\s+/g, ' ').trim() ?? '',
      cards: document.querySelectorAll('.blog-grid > .content-post-card').length,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.currentSrc || image.src),
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      articleBody: Boolean(document.querySelector('.article-body')),
      articleCover: Boolean(document.querySelector('.article-hero > .content-cover')),
      jsonLd: Boolean(document.querySelector('script[type="application/ld+json"]')),
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') ?? null,
      searchValue: document.querySelector('.blog-search input')?.value ?? null,
      currentPage: document.querySelector('.blog-pagination [aria-current="page"]')?.textContent?.trim() ?? null
    }))()`);

    const focusOrder: Array<{ tag: string; text: string; href: string | null; aria: string | null }> = [];
    if (keyboard) {
      await evaluate("document.activeElement?.blur(); document.body.tabIndex = -1; document.body.focus(); true");
      for (let index = 0; index < 12; index += 1) {
        await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
        await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9, nativeVirtualKeyCode: 9 });
        focusOrder.push(await evaluate(`(() => { const element = document.activeElement; return { tag: element?.tagName ?? '', text: element?.textContent?.replace(/\\s+/g, ' ').trim().slice(0, 80) ?? '', href: element?.getAttribute?.('href') ?? null, aria: element?.getAttribute?.('aria-label') ?? null }; })()`));
      }
    }
    if (process.env.BLOG_QA_SCREENSHOT_DIR && metrics.articleBody) {
      const directory = process.env.BLOG_QA_SCREENSHOT_DIR;
      await mkdir(directory, { recursive: true });
      const screenshot = await send<{ data: string }>("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      const filename = `${path.split("/").at(-1)}-${viewport.width}.png`;
      await writeFile(join(directory, filename), Buffer.from(screenshot.data, "base64"));
      await evaluate("window.scrollTo({ top: document.querySelector('.article-hero').getBoundingClientRect().height + 300, behavior: 'instant' }); true");
      const bodyScreenshot = await send<{ data: string }>("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      await writeFile(join(directory, `body-${filename}`), Buffer.from(bodyScreenshot.data, "base64"));
    }
    return { path, viewport, metrics, focusOrder, consoleErrors, failedRequests };
  } finally {
    socket.close();
    await closeTarget(target.id);
  }
}

async function main() {
  const desktop = { width: 1440, height: 900, mobile: false };
  const checks = [
    await inspectPage("/blog", desktop, true),
    await inspectPage("/blog?pagina=2", desktop),
    await inspectPage("/blog?q=alcohol", desktop),
    await inspectPage("/blog?q=alcohol&pagina=2", desktop),
    await inspectPage("/blog/tipos-de-terapias-en-tratamiento-de-adicciones", desktop),
    await inspectPage("/blog/alcohol-y-conduccion", desktop),
    await inspectPage("/blog", { width: 375, height: 812, mobile: true }),
    await inspectPage("/blog/tipos-de-terapias-en-tratamiento-de-adicciones", { width: 375, height: 812, mobile: true }, true),
    await inspectPage("/blog/alcohol-y-conduccion", { width: 375, height: 812, mobile: true }),
    await inspectPage("/blog/vuelta-a-la-rutina-y-consumo-de-alcohol", desktop),
    await inspectPage("/blog/vuelta-a-la-rutina-y-consumo-de-alcohol", { width: 375, height: 812, mobile: true }),
  ];

  console.log(JSON.stringify({ status: "INSPECTED", checks }, null, 2));

  for (const check of checks) {
    assert(check.metrics.h1.length > 0, `${check.path} rendered without an H1.`);
    assert(!check.metrics.horizontalOverflow, `${check.path} overflows horizontally at ${check.viewport.width}px.`);
    assert(check.metrics.brokenImages.length === 0, `${check.path} contains broken images.`);
    assert(check.consoleErrors.length === 0, `${check.path} emitted browser errors.`);
    assert(check.failedRequests.length === 0, `${check.path} contains failed network requests.`);
  }
  assert(checks[0].metrics.cards === 12 && checks[0].metrics.total.includes("232"), "The main blog listing is incomplete.");
  assert(checks[1].metrics.cards === 12 && checks[1].metrics.currentPage?.startsWith("2"), "Page 2 did not render correctly.");
  assert(checks[2].metrics.cards === 12 && checks[2].metrics.total.includes("186") && checks[2].metrics.searchValue === "alcohol", "Search results are incorrect.");
  assert(checks[3].metrics.cards === 12 && checks[3].metrics.currentPage?.startsWith("2"), "Search pagination did not render correctly.");
  assert(checks[4].metrics.articleBody && checks[4].metrics.jsonLd && checks[4].metrics.canonical?.includes(checks[4].path), "The oldest article is missing content or SEO metadata.");
  assert(checks[4].metrics.articleCover, "The image article is missing its hero cover.");
  assert(checks[5].metrics.articleBody && !checks[5].metrics.articleCover, "The no-image article did not use the expected fallback layout.");
  assert(checks[6].metrics.innerWidth === 375, "Mobile emulation did not use a 375px viewport.");
  assert(checks[0].focusOrder.filter((entry) => entry.tag === "A" || entry.tag === "INPUT" || entry.tag === "BUTTON").length >= 10, "Keyboard focus did not traverse the expected interactive controls.");
  console.log("Browser QA status: PASS");
}

main().catch((error) => {
  console.error("Browser QA failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
