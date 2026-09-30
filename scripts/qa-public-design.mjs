import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const base = process.env.CMS_QA_BASE_URL ?? "http://localhost:3300";
const output = "tmp/public-design-qa";
const results = [];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CMS_QA_CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe" });
try {
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/*", (route) => { const headers = route.request().headers(); return headers["next-router-prefetch"] || headers["next-router-segment-prefetch"] || headers.purpose === "prefetch" ? route.abort() : route.continue(); });
  for (const width of [320, 375, 390, 768, 1024, 1180, 1280, 1440, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base, { waitUntil: "load" });
    await page.waitForTimeout(350);
    const metrics = await page.evaluate(() => {
      const elements = [".public-header__brand", ".public-header__navigation", ".public-header__cta", "#mobile-menu-toggle"].map((selector) => document.querySelector(selector)).filter((element) => element && getComputedStyle(element).display !== "none").map((element) => ({ label: element.className, rect: element.getBoundingClientRect().toJSON() }));
      return { overflow: document.documentElement.scrollWidth > innerWidth + 1, headerCollision: elements.some((element, index) => elements.slice(index + 1).some((other) => element.rect.left < other.rect.right && element.rect.right > other.rect.left && element.rect.top < other.rect.bottom && element.rect.bottom > other.rect.top)), h1: document.querySelectorAll("h1").length };
    });
    assert.equal(metrics.overflow, false, `Home overflow at ${width}`);
    assert.equal(metrics.headerCollision, false, `Header overlap at ${width}`);
    assert.equal(metrics.h1, 1);
    results.push({ path: "/", width, status: "PASS", ...metrics });
    if ([375, 768, 1440].includes(width)) await page.screenshot({ path: join(output, `home-${width}.png`), fullPage: true });
    if (width === 1440) await page.screenshot({ path: join(output, "home-preview.png") });
  }
  for (const width of [375, 768, 1440]) for (const [name, path] of [["instituto", "/instituto"], ["tratamiento", "/acompanamiento"], ["recovery", "/recovery-40"], ["metodo", "/nuestro-enfoque"], ["familias", "/familias"], ["equipo", "/equipo"], ["perfil", "/equipo/marcelo-montiel"], ["faq", "/preguntas-frecuentes"], ["contacto", "/contacto"], ["blog", "/blog"], ["articulo", "/blog/alcohol-y-conduccion"]]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(base + path, { waitUntil: "load" });
    assert.equal(response.status(), 200, path);
    await page.waitForTimeout(350);
    const metrics = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 1, h1: document.querySelectorAll("h1").length, brokenImages: [...document.images].filter((image) => image.complete && !image.naturalWidth).map((image) => image.src) }));
    assert.equal(metrics.overflow, false, `${path}: overflow at ${width}`);
    assert.equal(metrics.h1, 1, path);
    assert.deepEqual(metrics.brokenImages, [], path);
    results.push({ path, width, status: "PASS", ...metrics });
    if (["tratamiento", "perfil", "contacto", "blog"].includes(name) && width !== 768) await page.screenshot({ path: join(output, `${name}-${width}.png`), fullPage: true });
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(base, { waitUntil: "load" });
  for (const id of ["instituto", "tratamiento", "recursos"]) {
    const hoverTrigger = page.locator(`[data-navigation-trigger="${id}"]`);
    const panel = page.locator(`#navigation-${id}`);
    await hoverTrigger.hover();
    await page.waitForFunction((group) => document.querySelector(`[data-navigation-trigger="${group}"]`)?.getAttribute("aria-expanded") === "true", id);
    await panel.waitFor({ state: "visible" });
    await panel.locator("a").first().hover();
    await page.waitForTimeout(200);
    assert.equal(await hoverTrigger.getAttribute("aria-expanded"), "true", "Hover must stay open over its links");
    assert.equal(await panel.evaluate((element) => getComputedStyle(element).opacity), "1");
    await page.locator("h1").hover();
    await panel.waitFor({ state: "hidden" });
    assert.equal(await panel.evaluate((element) => element.inert), true, "Closed links must leave keyboard navigation");
    results.push({ path: `Desktop hover: ${id}, pointer travel, animated close, inert links`, status: "PASS" });
  }
  const trigger = page.locator('[data-navigation-trigger="instituto"]');
  await trigger.focus(); await page.keyboard.press("Enter");
  await page.locator("#navigation-instituto").waitFor({ state: "visible" });
  await page.keyboard.press("Tab");
  assert(await page.evaluate(() => document.querySelector("#navigation-instituto")?.contains(document.activeElement)));
  await page.keyboard.press("Escape");
  await page.locator("#navigation-instituto").waitFor({ state: "hidden" });
  assert(await trigger.evaluate((element) => element === document.activeElement));
  await trigger.focus(); await page.keyboard.press("Enter");
  assert.equal(await trigger.getAttribute("aria-expanded"), "true");
  await page.locator("h1").click();
  await page.locator("#navigation-instituto").waitFor({ state: "hidden" });
  results.push({ path: "Desktop dropdown: keyboard, Escape, outside click", status: "PASS" });

  await page.setViewportSize({ width: 375, height: 900 });
  const toggle = page.locator("#mobile-menu-toggle");
  await toggle.click();
  const dialog = page.getByRole("dialog", { name: "Menú principal" });
  await dialog.waitFor({ state: "visible" });
  for (let index = 0; index < 20; index++) {
    await page.keyboard.press("Tab");
    assert(await dialog.evaluate((element) => element.contains(document.activeElement)), "Mobile focus left modal");
  }
  for (let index = 0; index < 20; index++) {
    await page.keyboard.press("Shift+Tab");
    assert(await dialog.evaluate((element) => element.contains(document.activeElement)), "Reverse mobile focus left modal");
  }
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });
  await page.waitForFunction(() => document.body.style.overflow !== "hidden");
  assert(await toggle.evaluate((element) => element === document.activeElement));
  await toggle.click();
  await page.getByRole("navigation", { name: "Navegación móvil" }).locator("summary").filter({ hasText: "Instituto" }).click();
  await page.screenshot({ path: join(output, "menu-375.png") });
  await dialog.getByRole("link", { name: "Equipo", exact: true }).click();
  await page.waitForURL(base + "/equipo"); await dialog.waitFor({ state: "hidden" });
  await toggle.click(); await page.setViewportSize({ width: 1280, height: 900 });
  await dialog.waitFor({ state: "hidden" });
  results.push({ path: "Mobile modal: focus trap, Escape, route change, resize", status: "PASS" });

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(base, { waitUntil: "load" });
  assert.equal(await page.locator(".page-transition").evaluate((element) => getComputedStyle(element).animationName), "none");
  await page.locator('[data-navigation-trigger="instituto"]').hover();
  assert.equal(await page.locator("#navigation-instituto").evaluate((element) => getComputedStyle(element).transitionDuration), "0s");
  await page.locator("h1").hover();
  await page.getByRole("link", { name: "Tratamiento ambulatorio", exact: true }).click();
  await page.waitForURL(base + "/acompanamiento");
  results.push({ path: "Reduced motion + editable home card destination", status: "PASS" });
  assert.deepEqual(errors, [], "Browser runtime errors");
  await writeFile(join(output, "results.json"), JSON.stringify({ status: "PASS", checks: results }, null, 2));
  console.log(`PASS: ${results.length} public design checks, 9 widths, keyboard/mobile navigation and CMS card links.`);
} finally { await browser.close(); }
