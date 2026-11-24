import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { auditCareMobile } from './qa-care-mobile.mjs';

// Optional addition to the existing isolated QA suites. Uses their normal
// authenticated browser contexts; creates neither identities nor clinical data.
export async function auditCareUX(context, group, routes) {
  await auditCareMobile(context, group, routes);
  if (process.env.CARE_UX_AUDIT !== 'true') return;
  assert.equal(process.env.NEXT_PUBLIC_SITE_URL, 'http://localhost:3450');
  const output = 'tmp/care-qa/ux';
  await mkdir(output, { recursive: true });
  const page = await context.newPage();
  const results = [];
  try {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const [name, route] of routes) {
      assert.ok(route.startsWith('/admin/seguimiento') || route.startsWith('/pacientes/'));
      const response = await page.goto('http://localhost:3450' + route);
      if(name==='recoverable-error')assert.ok([200,500].includes(response.status()),'Expected an actual authorized rendering error');
      else assert.equal(response.status(), 200, `${group}/${name}: route must load`);
      await page.locator('main h1').first().waitFor();
      await page.evaluate(() => document.fonts.ready);
      for (const width of [320, 375, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.locator((group.startsWith('recovery-')||group.startsWith('decisions')||group.startsWith('informs')||group.startsWith('jobs'))?'main details':'form details').evaluateAll((es, expanded) => { for (const e of es) e.open = expanded; }, width === 375);
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await page.evaluate(() => scrollTo(0, 0));
        const findings = await page.evaluate(() => {
          const issues = [];
          const describe = e => `${e.tagName.toLowerCase()}${e.className && typeof e.className === 'string' ? '.' + e.className.trim().replace(/\s+/g, '.') : ''}`;
          const add = (rule, e, detail) => issues.push({ rule, element: e ? describe(e) : 'document', ...detail });
          const shown = e => {
            const s = getComputedStyle(e), r = e.getBoundingClientRect();
            return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && !e.closest('[inert]') && !(e.closest('.admin-sidebar') && r.right <= 0);
          };
          if (document.documentElement.scrollWidth > innerWidth + 1) add('horizontal-overflow', null);
          if (document.querySelectorAll('main h1').length !== 1) add('one-main-heading', null);
          for (const e of document.querySelectorAll('.care-form')) {
            const draft=[...e.querySelectorAll('button')].find(b => /Guardar borrador/.test(b.textContent));
            if(draft && !draft.classList.contains('admin-button-secondary')) add('draft-action-hierarchy', draft);
          }
          const path=location.pathname, params=new URLSearchParams(location.search);
          if(path==='/admin/seguimiento/evidencia' && (params.get('metrica')??'records')!=='records' && document.querySelector('a[href="/admin/seguimiento/evidencia?metrica=records"][aria-current="page"]')) add('incorrect-source-navigation', null);
          if(path==='/pacientes/resumenes' && !document.querySelector('.patient-sidebar a[href="/pacientes/resumenes"][aria-current="page"]')) add('summaries-navigation', null);
          const ids = new Set();
          for (const e of document.querySelectorAll('[id]')) { if (ids.has(e.id)) add('duplicate-id', e); ids.add(e.id); }
          for (const e of document.querySelectorAll('input:not([type=hidden]),select,textarea')) {
            if (!(e.labels?.length || e.getAttribute('aria-label') || e.getAttribute('aria-labelledby'))) add('control-name', e);
          }
          for (const e of document.querySelectorAll('[aria-describedby],[aria-labelledby]')) {
            for (const id of `${e.getAttribute('aria-describedby') ?? ''} ${e.getAttribute('aria-labelledby') ?? ''}`.trim().split(/\s+/)) {
              if (id && !document.getElementById(id)) add('missing-aria-reference', e);
            }
          }
          for (const e of document.querySelectorAll('button,summary')) {
            if (shown(e) && !e.textContent.trim() && !e.getAttribute('aria-label')) add('action-name', e);
          }
          for (const nav of document.querySelectorAll('nav')) {
            if (!nav.getAttribute('aria-label') && !nav.getAttribute('aria-labelledby')) add('navigation-name', nav);
          }
          for (const e of document.querySelectorAll('.care-form textarea')) {
            if (shown(e) && e.rows <= 3 && e.getBoundingClientRect().height > 150) add('brief-textarea-too-tall', e);
          }
          for (const e of document.querySelectorAll('.care-workspace button,.care-patient-workspace button,.care-search button,.care-form input:not([type=hidden]):not([type=checkbox]),.care-form select')) {
            if (shown(e) && !e.matches(':disabled') && e.getBoundingClientRect().height < 44) add('touch-control-under-44', e);
          }
          // Solid CSS text contrast. No screenshots, names, answers or clinical
          // bodies enter the JSON. Images/gradients require manual visual review.
          const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          const color = css => { ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = css; ctx.fillRect(0, 0, 1, 1); return [...ctx.getImageData(0, 0, 1, 1).data]; };
          const blend = (fg, bg) => fg.slice(0, 3).map((v, i) => v * fg[3] / 255 + bg[i] * (1 - fg[3] / 255));
          const background = e => {
            const chain = []; for (let p = e; p; p = p.parentElement) chain.unshift(p);
            let bg = [255, 255, 255];
            for (const p of chain) { const s = getComputedStyle(p); if (s.backgroundImage !== 'none' || Number(s.opacity) !== 1) return null; bg = blend(color(s.backgroundColor), bg); }
            return bg;
          };
          const lum = rgb => rgb.map(v => v / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((n, v, i) => n + v * [.2126, .7152, .0722][i], 0);
          for (const e of document.querySelectorAll('main *,nav *,header *,footer *')) {
            if (!shown(e) || e.matches('option,svg,svg *') || e.closest('button:disabled,fieldset:disabled') || ![...e.childNodes].some(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim())) continue;
            const s = getComputedStyle(e), bg = background(e); if (!bg) continue;
            const fg = blend(color(s.color), bg), a = lum(fg), b = lum(bg), ratio = (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
            const large = parseFloat(s.fontSize) >= 24 || (parseFloat(s.fontSize) >= 18.66 && Number(s.fontWeight) >= 700), minimum = large ? 3 : 4.5;
            if (ratio < minimum) add('text-contrast', e, { ratio: Number(ratio.toFixed(2)), minimum });
          }
          return issues;
        });
        const screenshot = `${output}/${group}-${name}-${width}.png`;
        await page.screenshot({ path: screenshot, fullPage: true });
        if(width===375||width===1440) await page.screenshot({path:`${output}/${group}-${name}-${width}-top.png`,fullPage:false});
        results.push({ name, width, expandedFormSections:width===375, status: findings.length ? 'FAIL' : 'PASS', findings, screenshot });
      }
      const links = await page.locator('.admin-breadcrumbs a').evaluateAll(es => es.map(e => e.getAttribute('href')));
      for (const href of [...new Set(links)]) {
        const r = await context.request.get('http://localhost:3450' + href);
        if (r.status() !== 200) results.push({ name, status: 'FAIL', findings: [{ rule: 'broken-breadcrumb', status: r.status(), route: href.replace(/[0-9a-f-]{36}/gi, ':id') }] });
      }
      if(name==='recoverable-error') {
        await page.getByRole('heading',{name:'No fue posible cargar seguimiento',exact:true}).waitFor();
        await page.getByRole('link',{name:'Volver al panel',exact:true}).click();
        await page.getByRole('heading',{name:'Seguimiento terapéutico',exact:true}).waitFor();
        results.push({name:'error-recovery',status:'PASS',findings:[]});
      }
    }
    if (routes[0]?.[1].startsWith('/admin/')) {
      await page.setViewportSize({ width: 320, height: 568 });
      const menu = page.locator('aside.admin-sidebar'), trigger = page.getByRole('button', { name: 'Abrir navegación', exact: true });
      const findings = [];
      if (!(await menu.evaluate(e => e.inert))) findings.push({ rule: 'closed-mobile-menu-focusable' });
      await trigger.focus(); await page.keyboard.press('Enter');
      await page.screenshot({ path: `${output}/${group}-mobile-menu.png`, fullPage: false });
      if (!(await menu.evaluate(e => e.contains(document.activeElement)))) findings.push({ rule: 'menu-initial-focus' });
      if(!(await page.locator('.admin-workspace').evaluate(e=>e.inert))) findings.push({rule:'menu-background-active'});
      const layout=await menu.evaluate(e=>{
        const brand=e.querySelector('.brand-logo').getBoundingClientRect(),close=e.querySelector('.admin-sidebar-mobile-close').getBoundingClientRect(),footer=e.querySelector('.admin-sidebar-footer').getBoundingClientRect();
        return {overlap:brand.right>close.left-3,footerClipped:footer.bottom>innerHeight+1};
      });
      if(layout.overlap)findings.push({rule:'menu-logo-close-overlap'});
      if(layout.footerClipped)findings.push({rule:'menu-footer-clipped'});
      for(const link of await menu.locator('nav a').all()) {
        await link.focus();
        if(!(await link.evaluate(e=>{const r=e.getBoundingClientRect(),n=e.closest('nav').getBoundingClientRect();return r.top>=n.top-1&&r.bottom<=n.bottom+1;}))) findings.push({rule:'menu-link-unreachable-on-short-screen'});
      }
      const last = menu.locator('a,button').filter({ visible: true }).last();
      await last.focus(); await page.keyboard.press('Tab');
      if (!(await menu.evaluate(e => e.contains(document.activeElement)))) findings.push({ rule: 'menu-focus-trap' });
      const first=menu.locator('a,button').filter({visible:true}).first();await first.focus();await page.keyboard.press('Shift+Tab');
      if(!(await last.evaluate(e=>e===document.activeElement))) findings.push({rule:'menu-reverse-focus-trap'});
      await page.keyboard.press('Escape');
      if ((await menu.getAttribute('data-mobile-open')) !== 'false') findings.push({ rule: 'menu-escape-close' });
      if (!(await trigger.evaluate(e => e === document.activeElement))) findings.push({ rule: 'menu-return-focus' });
      if(!(await menu.evaluate(e=>e.inert))) findings.push({rule:'closed-menu-not-inert'});
      results.push({ name: 'mobile-menu', status: findings.length ? 'FAIL' : 'PASS', findings });
      await page.setViewportSize({width:1440,height:1000});
      const collapsedFindings=[];
      await page.getByRole('button',{name:'Contraer barra lateral',exact:true}).focus();await page.keyboard.press('Enter');
      if(await menu.getByRole('link',{name:/\S/}).count()!==await menu.locator('a').count())collapsedFindings.push({rule:'collapsed-link-without-accessible-name'});
      const current=menu.locator('nav a[aria-current="page"]');await current.focus();
      if(!(await current.evaluate(e=>parseFloat(getComputedStyle(e).outlineWidth)>=2)))collapsedFindings.push({rule:'sidebar-focus-not-visible'});
      await page.screenshot({path:`${output}/${group}-collapsed.png`,fullPage:false});
      await page.getByRole('button',{name:'Expandir barra lateral',exact:true}).click();
      results.push({name:'collapsed-sidebar',status:collapsedFindings.length?'FAIL':'PASS',findings:collapsedFindings});
      const accountFindings=[],account=page.locator('.admin-user-menu summary');
      if(await account.getAttribute('aria-label')!=='Menú de cuenta')accountFindings.push({rule:'account-menu-accessible-name'});
      await account.focus();await page.keyboard.press('Enter');
      if(!(await page.locator('.admin-user-menu').evaluate(e=>e.open)))accountFindings.push({rule:'account-menu-keyboard-open'});
      await page.keyboard.press('Escape');
      if(await page.locator('.admin-user-menu').evaluate(e=>e.open)||!(await account.evaluate(e=>e===document.activeElement)))accountFindings.push({rule:'account-menu-escape-focus'});
      results.push({name:'account-menu',status:accountFindings.length?'FAIL':'PASS',findings:accountFindings});
    }
  } finally {
    await page.close();
    await writeFile(`${output}/${group}.json`, JSON.stringify({ group, at: new Date().toISOString(), environment: 'local-only', results }, null, 2));
  }
  const failures = results.filter(r => r.status === 'FAIL');
  console.log(`UX ${group}: ${results.length} pantallas/recorridos, ${failures.length} con hallazgos. Evidencia local sin datos reales.`);
}
