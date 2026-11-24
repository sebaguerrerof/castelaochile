import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { mobileCoverage as selected } from './care-mobile-coverage.mjs';

const require = createRequire(import.meta.url);
const { webkit } = require(require.resolve('playwright', { paths: [process.env.CODEX_NODE_MODULES ?? 'C:/Users/sebag/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'] }));

// Supplements existing suites using their ordinary authenticated sessions. No
// new identities, grants, offline caches or writes; fixture owners still clean up.
export async function auditCareMobile(source, group, routes) {
  if (process.env.CARE_MOBILE_AUDIT !== 'true' || !(group in selected)) return;
  assert.equal(process.env.NEXT_PUBLIC_SITE_URL, 'http://localhost:3450');
  const output = 'tmp/care-qa/mobile';
  await mkdir(output, { recursive: true });
  const results = [], storageState = await source.storageState();
  let safari, failure;
  try {
    safari = await webkit.launch({ headless: true });
    for (const [engine, browser] of [['chromium', source.browser()], ['webkit', safari]]) {
      const context = await browser.newContext({ storageState, isMobile: true, hasTouch: true, deviceScaleFactor: 2, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
      try {
        const page = await context.newPage();
        const pages = routes.filter(([name]) => selected[group] === null || selected[group].includes(name));
        assert.ok(pages.length > 0, `No mobile routes selected for ${group}`);
        if (selected[group]) assert.deepEqual(pages.map(([name]) => name).sort(), [...selected[group]].sort(), `Incomplete mobile route coverage: ${group}`);
        if (group === 'reports-staff') pages.push(['admin-login', '/admin/login'], ['patient-login', '/pacientes/login']);
        for (const [name, route] of pages) {
          assert.ok(route.startsWith('/admin/') || route.startsWith('/pacientes/'));
          const response = await page.goto('http://localhost:3450' + route);
          assert.equal(response.status(), 200, `${engine}/${group}/${name}`);
          assert.ok(!response.headers()['content-security-policy'].includes('upgrade-insecure-requests'), 'Marked HTTP QA must load scripts without an HTTPS upgrade');
          await page.locator('main h1').first().waitFor();
          await page.evaluate(() => document.fonts.ready);
          for (const [label, width, height, safe] of [
            ['small', 320, 568], ['android', 360, 800], ['iphone', 390, 844], ['large', 430, 932],
            ['landscape', 844, 390], ['large-landscape', 932, 430], ['short-viewport', 390, 320], ['safe-landscape', 844, 390, true], ['safe-portrait', 390, 844, true],
          ]) {
            await page.setViewportSize({ width, height });
            const horizontalInset = safe && width > 640 ? 44 : 0;
            await page.evaluate(({ safe, horizontalInset }) => {
              for (const [side, value] of Object.entries({ top: safe && !horizontalInset ? 47 : 0, right: horizontalInset, bottom: safe ? (horizontalInset ? 21 : 34) : 0, left: horizontalInset }))
                document.documentElement.style.setProperty(`--app-safe-${side}`, `${value}px`);
              for (const e of document.querySelectorAll('main details')) e.open = true;
            }, { safe: !!safe, horizontalInset });
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
            const findings = await page.evaluate(({ horizontalInset }) => {
              const issues = [];
              if (document.documentElement.scrollWidth > innerWidth + 1) issues.push({rule:'horizontal-overflow',scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,elements:[...document.querySelectorAll('main *')].filter(e=>e.scrollWidth>e.clientWidth+1||e.getBoundingClientRect().right>innerWidth+1).slice(0,12).map(e=>({tag:e.tagName,css:typeof e.className==='string'?e.className:'',type:e.getAttribute('type'),client:e.clientWidth,scroll:e.scrollWidth,left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right}))});
              const visible = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && !e.closest('[inert]') && getComputedStyle(e).visibility !== 'hidden'; };
              for (const e of document.querySelectorAll('main input:not([type=checkbox]):not([type=radio]), main select, main textarea')) {
                if (!visible(e)) continue;
                if (parseFloat(getComputedStyle(e).fontSize) < 16) issues.push(`input-font:${e.id || e.name}`);
                const r = e.getBoundingClientRect();
                if (r.left < horizontalInset - 1 || r.right > innerWidth - horizontalInset + 1) issues.push(`input-clipped:${e.id || e.name}`);
              }
              const viewport = document.querySelector('meta[name=viewport]')?.content ?? '';
              if (!viewport.includes('viewport-fit=cover') || /user-scalable=no|maximum-scale=1(?:,|$)/.test(viewport)) issues.push('viewport-zoom');
              return issues;
            }, { horizontalInset });
            if (name === 'configuration') {
              await page.locator('#admin-navigation[inert]').waitFor({ state: 'attached' });
              await page.getByRole('button', { name: 'Abrir navegación', exact: true }).tap();
              const drawer = page.locator('#admin-navigation');
              await page.locator('#admin-navigation[data-mobile-open=true][role=dialog]').waitFor({ state: 'attached' });
              assert.equal(await drawer.getAttribute('data-mobile-open'), 'true');
              const last = drawer.locator('nav a').last();
              await last.scrollIntoViewIfNeeded();
              if (!await last.evaluate(e => { const r = e.getBoundingClientRect(), p = e.closest('nav').getBoundingClientRect(); return r.top >= p.top - 1 && r.bottom <= p.bottom + 1; })) findings.push('drawer-last-link-unreachable');
              await drawer.getByRole('button', { name: 'Cerrar navegación', exact: true }).focus();
              await page.keyboard.press('Escape');
              await page.locator('#admin-navigation[data-mobile-open=false]').waitFor({ state: 'attached' });
              assert.equal(await drawer.getAttribute('data-mobile-open'), 'false');
            }
            const sidebar = page.locator('.patient-sidebar');
            if (width > 640 && await sidebar.count()) {
              const last = sidebar.locator('nav a').last();
              await last.scrollIntoViewIfNeeded();
              if (!await last.evaluate(e => { const r = e.getBoundingClientRect(), p = e.closest('aside').getBoundingClientRect(); return r.top >= p.top - 1 && r.bottom <= p.bottom + 1; })) findings.push('sidebar-last-link-unreachable');
            }
            await page.evaluate(() => scrollTo(0, 0));
            await page.screenshot({ path: `${output}/${group}-${name}-${engine}-${label}.png`, fullPage: false });
            results.push({ engine, name, label, width, height, simulatedSafeArea: !!safe, status: findings.length ? 'FAIL' : 'PASS', findings });
          }
          await page.setViewportSize({ width: 390, height: 844 });
          await page.evaluate(() => { for (const side of ['top', 'right', 'bottom', 'left']) document.documentElement.style.setProperty(`--app-safe-${side}`, '0px'); });
          const recordEditor = page.locator('main textarea').first();
          const content = group.startsWith('records-') && await recordEditor.count()
            ? recordEditor
            : page.locator('main textarea,main input:not([type=hidden]):not([type=checkbox]):not([type=radio]),main figure').first();
          if (await content.count()) await content.scrollIntoViewIfNeeded();
          await page.screenshot({ path: `${output}/${group}-${name}-${engine}-content.png`, fullPage: false });
          if (group === 'planning-staff' && name === 'new-event') {
            await page.locator('.care-participant-options legend').scrollIntoViewIfNeeded();
            await page.screenshot({ path: `${output}/${group}-${name}-${engine}-participants.png`, fullPage: false });
          }
          if (group === 'records-psychiatry') {
            const medical = page.getByLabel('Indicaciones médicas', { exact: true });
            assert.equal(await medical.count(), 1, 'Audit the authorized medical form before revoking its capability');
            assert.ok(await medical.isEditable(), 'Medical audit must cover the editable authorized field');
            await medical.scrollIntoViewIfNeeded();
            await page.screenshot({ path: `${output}/${group}-${name}-${engine}-medical-fields.png`, fullPage: false });
          }
          const editor = page.locator('main textarea').first();
          if (await editor.count() && await editor.isEditable()) {
            await editor.tap();
            await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
            await editor.fill('Texto local sin enviar para comprobar adaptación móvil.');
            assert.equal(await editor.inputValue(), 'Texto local sin enviar para comprobar adaptación móvil.');
            await page.setViewportSize({ width: 390, height: 320 });
            await editor.scrollIntoViewIfNeeded();
            assert.equal(await editor.inputValue(), 'Texto local sin enviar para comprobar adaptación móvil.');
            results.push({ engine, name, label: 'text-retained-short-viewport', status: 'PASS', findings: [] });
          }
        }
        if (group === 'reports-staff') {
          await page.goto('http://localhost:3450/');
          const manifestLink = page.locator('link[rel=manifest]');
          assert.equal(await manifestLink.count(), 1);
          const manifestResponse = await context.request.get(new URL(await manifestLink.getAttribute('href'), page.url()).href);
          assert.equal(manifestResponse.status(), 200);
          const manifest = await manifestResponse.json();
          assert.equal(manifest.display, 'standalone'); assert.equal(manifest.scope, '/'); assert.equal(manifest.start_url, '/');
          for (const icon of manifest.icons) {
            const response = await context.request.get(new URL(icon.src, page.url()).href);
            assert.equal(response.status(), 200);
            assert.match(response.headers()['content-type'], /image\/png/);
            const bytes = await response.body(), size = Number(icon.sizes.split('x')[0]);
            assert.equal(bytes.readUInt32BE(16), size); assert.equal(bytes.readUInt32BE(20), size);
            await writeFile(`${output}/icon-${size}.png`, bytes);
          }
          const apple = page.locator('link[rel=apple-touch-icon]');
          assert.equal(await apple.count(), 1);
          const appleResponse = await context.request.get(new URL(await apple.getAttribute('href'), page.url()).href);
          assert.equal(appleResponse.status(), 200); const bytes = await appleResponse.body();
          assert.equal(bytes.readUInt32BE(16), 180); assert.equal(bytes.readUInt32BE(20), 180);
          await writeFile(`${output}/apple-icon.png`, bytes);
          // Next 16 emits the current standard name for appleWebApp.capable.
          assert.equal(await page.locator('meta[name=mobile-web-app-capable]').getAttribute('content'), 'yes');
          assert.equal(await page.locator('meta[name=apple-mobile-web-app-title]').getAttribute('content'), 'Castelao Chile');
          assert.equal((await context.serviceWorkers()).length, 0);
          results.push({ engine, name: 'pwa-metadata-icons', status: 'PASS', findings: [] });
          for (const [label, width, height, top, horizontalInset, bottom] of [
            ['small',320,568,0,0,0],['safe-portrait',390,844,47,0,34],['safe-landscape',844,390,0,44,21],['large-landscape',932,430,0,0,0],
          ]) {
            await page.setViewportSize({width,height});
            await page.evaluate(({top,horizontalInset,bottom})=>{
              for(const [side,value] of Object.entries({top,left:horizontalInset,right:horizontalInset,bottom}))document.documentElement.style.setProperty(`--app-safe-${side}`,`${value}px`);
              scrollTo({top:0,left:0,behavior:'instant'});
            },{top,horizontalInset,bottom});
            await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
            const trigger=page.getByRole('button',{name:'Abrir menú',exact:true});
            const box=await trigger.boundingBox();
            assert.ok(box.x>=horizontalInset-1&&box.x+box.width<=width-horizontalInset+1&&box.y>=top-1,`Public menu trigger respects safe insets: ${engine}/${label} ${JSON.stringify(box)}`);
            assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
            await trigger.tap();await page.locator('#mobile-navigation[open]').waitFor({state:'attached'});
            const close=page.getByRole('button',{name:'Cerrar menú',exact:true}),closeBox=await close.boundingBox();
            assert.ok(closeBox.x>=horizontalInset-1&&closeBox.x+closeBox.width<=width-horizontalInset+1&&closeBox.y>=top-1,'Public close respects safe insets');
            await page.screenshot({path:`${output}/public-menu-${engine}-${label}.png`,fullPage:false});
            await close.tap();await page.locator('#mobile-navigation:not([open])').waitFor({state:'attached'});
            results.push({engine,name:'pwa-home-menu',label,width,height,simulatedSafeArea:!!(top||horizontalInset||bottom),status:'PASS',findings:[]});
          }
        }
      } finally { await context.close(); }
    }
  } catch (error) {
    failure = error;
    throw error;
  } finally {
    if (safari) await safari.close();
    await writeFile(`${output}/${group}.json`, JSON.stringify({ group, status: failure || results.some(r => r.status === 'FAIL') ? 'FAIL' : 'PASS', ...(failure ? { error: failure.message } : {}), at: new Date().toISOString(), environment: 'local-only', physicalDevices: false, results }, null, 2));
  }
  const failures = results.filter(r => r.status === 'FAIL');
  console.log(`Mobile ${group}: ${results.length} controles Chromium/WebKit; ${failures.length} hallazgos.`);
  assert.equal(failures.length, 0, `Mobile ${group}: revisar tmp/care-qa/mobile/${group}.json`);
}
