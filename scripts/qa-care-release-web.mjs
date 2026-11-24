import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const require = createRequire(import.meta.url);
const { chromium } = require(require.resolve('playwright', { paths: [process.env.CODEX_NODE_MODULES ?? 'C:/Users/sebag/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'] }));
const base = 'http://localhost:3450', output = 'tmp/care-qa/step-11/web';
assert.equal(process.env.NEXT_PUBLIC_SITE_URL, base);
assert.equal(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin, 'http://127.0.0.1:54421');
assert.equal(process.env.PATIENT_AUTH_EMAILS_ENABLED, 'false');
assert.equal(process.env.ANALYTICS_ENABLED, 'false');
assert.equal(process.env.CONTACT_INTAKE_ENABLED, 'false');
assert.equal(JSON.parse(await readFile('tmp/patient-supabase-local/patient-qa.json','utf8')).project, 'castelao-patient-qa');
await mkdir(output, { recursive: true });
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const normal = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const token = randomUUID().slice(0,8), password = 'Aa1!' + randomBytes(18).toString('hex');
const email = `release-web-${token}@example.test`, slug = `release-web-${token}`;
const checks = [], navigation = [], errors = [];
let browser, server, user, failure, log = '';
const docker = 'C:/Users/sebag/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe';
function check(r) { if (r.error) throw new Error(r.error.message); return r.data; }
function pass(label) { checks.push(label); console.log('PASS: ' + label); }
async function sql(input) {
  return new Promise((resolve,reject) => {
    const p = spawn(docker,['exec','-i','supabase_db_castelao-patient-qa','psql','-X','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-t','-A'],{windowsHide:true,stdio:['pipe','pipe','pipe']});
    let out='',err='';p.stdout.on('data',d=>out+=d);p.stderr.on('data',d=>err+=d);p.stdin.end(input);p.on('error',reject);p.on('close',code=>code===0?resolve(out.trim()):reject(new Error(err)));
  });
}
async function inspect(page, route, width, label) {
  await page.setViewportSize({ width, height: 900 });
  const start = performance.now();
  const response = await page.goto(base + route, { waitUntil: 'load' });
  assert.equal(response.status(),200,route);
  await page.locator('h1').first().waitFor();
  if (route.startsWith('/blog')) {
    if (route.split('?')[0] === '/blog') await page.locator('.blog-results-summary').waitFor({state:'visible'});
    else await page.locator('.article-body').waitFor({state:'visible'});
    await page.locator('.blog-hero--skeleton').waitFor({state:'hidden'});
    await page.locator('.content-post-card--skeleton').first().waitFor({state:'detached'});
  }
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(() => ({
    h1: document.querySelectorAll('h1').length,
    overflow: document.documentElement.scrollWidth > innerWidth + 1,
    canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
    broken: [...document.images].filter(i => i.complete && i.naturalWidth === 0).map(i => i.src)
  }));
  assert.equal(metrics.h1,1); assert.equal(metrics.overflow,false); assert.deepEqual(metrics.broken,[]);
  if (!route.startsWith('/admin')) assert.ok(metrics.canonical);
  navigation.push({ route, width, load_ms: Math.round(performance.now()-start), status: 'PASS' });
  await page.screenshot({ path: `${output}/${label}-${width}.png`, fullPage: true });
  pass(`${label} @${width}: actual page, one H1, no overflow/broken loaded image`);
}
async function save(page, label) {
  const saved = page.waitForResponse(r => r.request().method()==='POST' && new URL(r.url()).pathname.startsWith('/admin/'));
  await page.getByRole('button',{name:label,exact:true}).click(); await saved;
  await page.waitForURL(/success=saved/);
}
try {
  assert.equal(await sql("select count(*)from cron.job where jobname='castelao-care-tick'and active;"),'0');
  user = check(await service.auth.admin.createUser({ email,password,email_confirm:true,user_metadata:{full_name:'Editor neutral QA final'} })).user;
  await sql(`insert into public.admin_users(user_id,role,is_active)values('${user.id}','editor',true);`);
  check(await normal.auth.signInWithPassword({email,password}));
  const before = JSON.parse(await sql("select jsonb_build_object('contacts',(select count(*)from public.contact_submissions),'analytics',(select count(*)from private.analytics_events));"));
  server = spawn(process.execPath,['node_modules/next/dist/bin/next','start','-p','3450'],{windowsHide:true,env:process.env,stdio:['ignore','pipe','pipe']});
  server.stdout.on('data',d=>log+=d);server.stderr.on('data',d=>log+=d);
  let ready=false;
  for(let i=0;i<40;i++) { try { ready=(await fetch(base+'/admin/login')).ok; }catch{} if(ready)break;await new Promise(r=>setTimeout(r,500)); }
  assert.ok(ready,'QA app must start');
  browser=await chromium.launch({headless:true,executablePath:process.env.PATIENT_QA_CHROME??'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  const publicContext=await browser.newContext(), adminContext=await browser.newContext();
  for(const c of [publicContext,adminContext]) { c.on('page',p=>p.on('pageerror',e=>errors.push(e.message))); await c.route('**/*',route=>{const h=route.request().headers();return h['next-router-prefetch']||h['next-router-segment-prefetch']||h.purpose==='prefetch'?route.abort():route.continue();}); }
  const publicPage=await publicContext.newPage(), admin=await adminContext.newPage();
  await publicPage.emulateMedia({reducedMotion:'reduce'});
  for(const width of [320,375,768,1440]) for(const [route,label]of [['/','home'],['/tratamiento','treatment'],['/equipo','team'],['/contacto','contact'],['/blog','blog-empty']]) await inspect(publicPage,route,width,label);
  await admin.goto(base+'/admin/login');
  const login=admin.locator('form').filter({has:admin.getByLabel('Contraseña',{exact:true})});
  await login.getByLabel(/correo/i).fill(email);await login.getByLabel('Contraseña',{exact:true}).fill(password);await login.getByRole('button',{name:'Ingresar',exact:true}).click();await admin.waitForURL('**/admin');
  await admin.goto(base+'/admin/contenidos/nuevo');await admin.getByRole('combobox',{name:/^Tipo/}).selectOption('news');
  await admin.getByLabel('Título',{exact:true}).fill('Noticia neutral QA final');await admin.getByLabel('Slug',{exact:true}).fill(slug+'-draft');
  await admin.getByLabel('Extracto / bajada',{exact:true}).fill('Texto neutral de regresión local del CMS y sus permisos.');
  await admin.locator('.tiptap[contenteditable=true]').fill('Contenido neutral de la regresión local del editor institucional.');
  await save(admin,'Crear contenido');
  const post=check(await normal.from('content_posts').select('id,status').eq('slug',slug+'-draft').single());assert.equal(post.status,'draft');
  await admin.goto(`${base}/admin/contenidos/${post.id}/editar`);await admin.getByLabel('SEO title',{exact:true}).fill('Noticia neutral QA editada');await save(admin,'Guardar cambios');
  assert.equal(check(await normal.from('content_posts').select('seo_title').eq('id',post.id).single()).seo_title,'Noticia neutral QA editada');
  pass('Normal CMS browser creates and edits a persisted news draft without granting clinical access');
  await inspect(admin,`/admin/contenidos/${post.id}/editar`,375,'cms-editor');await inspect(admin,'/admin/noticias',1440,'cms-list');
  const denied=await adminContext.request.get(base+'/admin/seguimiento/indicadores');assert.equal(denied.status(),403);assert.match(denied.headers()['cache-control'],/no-store/);assert.match(denied.headers()['x-robots-tag'],/noindex/);assert.doesNotMatch(await denied.text(),/Persona neutral/);
  pass('CMS clinical navigation remains denied, private/no-store and noindex');
  const anon=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  assert.equal(check(await anon.from('content_posts').select('id').eq('id',post.id)).length,0);
  pass('Anonymous REST cannot read the owned unpublished draft');
  const publishedAt=new Date(Date.now()-60000).toISOString();
  for(let i=1;i<=13;i++) check(await normal.from('content_posts').insert({kind:'blog',slug:slug+'-article-'+i,title:`Artículo neutral recuperación ${i}`,summary:'Artículo neutral para verificar búsqueda y paginación del blog local.',body:'Texto editorial neutral.',content_html:'<p>Contenido neutral del artículo para la regresión del blog.</p>',content_text:'Contenido neutral del artículo para la regresión del blog.',status:'published',published_at:publishedAt,author_id:user.id,author_name:'Equipo neutral QA',reading_time_minutes:1}));
  const search='/blog?q='+encodeURIComponent('Artículo neutral recuperación');
  await publicPage.goto(base+search);await publicPage.locator('.blog-results-summary').waitFor({state:'visible'});await publicPage.locator('.content-post-card--skeleton').first().waitFor({state:'detached'});assert.equal(await publicPage.locator('.blog-grid > .content-post-card').count(),12);
  await publicPage.goto(base+search+'&pagina=2');await publicPage.locator('.blog-results-summary').waitFor({state:'visible'});await publicPage.locator('.content-post-card--skeleton').first().waitFor({state:'detached'});assert.equal(await publicPage.locator('.blog-grid > .content-post-card').count(),1);
  assert.match(await publicPage.locator('.blog-pagination [aria-current="page"]').innerText(),/2/);
  pass('Thirteen local synthetic published articles exercise real blog search and page 2, without duplicate cards');
  for(const width of [320,375,768,1440]) await inspect(publicPage,'/blog/'+slug+'-article-1',width,'article');
  assert.ok(await publicPage.locator('.article-body').isVisible());assert.ok(await publicPage.locator('script[type="application/ld+json"]').count());
  pass('Public article uses existing renderer, canonical and structured metadata');
  await publicPage.setViewportSize({width:375,height:812});await publicPage.goto(base);
  const toggle=publicPage.getByRole('button',{name:'Abrir menú',exact:true});await toggle.focus();await publicPage.keyboard.press('Enter');
  await publicPage.getByRole('navigation',{name:'Navegación móvil'}).waitFor({state:'visible'});await publicPage.keyboard.press('Escape');await publicPage.locator('#mobile-navigation').waitFor({state:'hidden'});
  // Native dialog closes before its queued close event updates React state.
  // Require the accessible state to settle rather than sampling that interval.
  await publicPage.waitForFunction(() => document.getElementById('mobile-menu-toggle')?.getAttribute('aria-expanded') === 'false', undefined, { timeout: 5000 });
  assert.equal(await publicPage.locator('#mobile-menu-toggle').getAttribute('aria-expanded'),'false');
  assert.equal(await publicPage.locator('#mobile-menu-toggle').evaluate(e => e === document.activeElement), true);
  assert.equal(await publicPage.locator('.page-transition').evaluate(e=>getComputedStyle(e).animationName),'none');
  pass('Public mobile menu works by keyboard/Enter/Escape and reduced motion disables page animation');
  const sitemap=await publicContext.request.get(base+'/sitemap.xml');assert.equal(sitemap.status(),200);assert.doesNotMatch(await sitemap.text(),/\/admin|\/pacientes|\/seguimiento/);
  pass('Sitemap contains no admin, patient or therapeutic routes');
  assert.equal((await publicContext.request.post(base+'/api/analytics',{data:{event:'page_view',eventId:randomUUID(),path:'/'}})).status(),503);
  assert.equal((await publicContext.request.post(base+'/api/contact',{data:{name:'Persona neutral QA'}})).status(),503);
  assert.deepEqual(JSON.parse(await sql("select jsonb_build_object('contacts',(select count(*)from public.contact_submissions),'analytics',(select count(*)from private.analytics_events));")),before);
  pass('Disabled public intake/analytics reject requests and persist no event/contact; no external email');
  await sql(`update public.admin_users set is_active=false where user_id='${user.id}';`);
  const revoked=await adminContext.request.get(base+'/admin/noticias');assert.ok([302,303,307,403].includes(revoked.status())||revoked.url().includes('/admin/login'));
  assert.equal(check(await normal.from('content_posts').select('id').eq('author_id',user.id).eq('status','draft')).length,0);
  pass('Suspended CMS identity loses private UI and unpublished REST reads with the previous session');
  assert.deepEqual(errors,[]);
} catch(error) {
  failure=error;
  if(browser) { let n=0;for(const c of browser.contexts())for(const p of c.pages())try{await p.screenshot({path:`${output}/failure-${n++}.png`,fullPage:true});}catch{} }
}
finally {
  if(browser)await browser.close();if(server)server.kill();
  await writeFile(`${output}/server.log`,log);
  try {
    if(user) {
      assert.match(user.id,/^[a-f0-9-]{36}$/);
      await sql(`begin;delete from public.content_posts where author_id='${user.id}'and slug like '${slug}-%';delete from public.admin_audit_log where actor_id='${user.id}';delete from public.admin_users where user_id='${user.id}';commit;`);
      check(await service.auth.admin.deleteUser(user.id));
      assert.equal(await sql(`select count(*)from auth.users where id='${user.id}'and email='${email}';`),'0');
      assert.equal(await sql(`select count(*)from public.content_posts where slug like '${slug}-%';`),'0');
    }
    pass('Only owned CMS/Auth/article fixtures removed; server/browser closed');
  }catch(error){failure??=error;}
  await writeFile(`${output}/results.json`,JSON.stringify({status:failure?'FAIL':'PASS',at:new Date().toISOString(),checks,count:checks.length,navigation,physical_devices_tested:false,real_email_sent:false,...failure?{error:failure.message}:{cleanup:'complete'}},null,2));
}
if(failure){console.error(failure.message);process.exitCode=1;}
