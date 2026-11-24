import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {createClient} from '@supabase/supabase-js';
import {createServerClient} from '@supabase/ssr';
const {chromium}=createRequire(import.meta.url)('playwright');
const base=process.env.CMS_QA_BASE_URL??'http://localhost:3446';
assert.equal(new URL(base).hostname,'localhost','Esta comprobación abre exclusivamente la vista local.');
const imported=JSON.parse(await readFile('tmp/client-content-2026-11-06/import-result.json','utf8'));
const smoke=process.argv.includes('--smoke');
const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const service=createClient(url,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
function db(result){assert.ifError(result.error);return result.data;}
const staff=db(await service.from('admin_users').select('user_id').eq('role','superadmin').eq('is_active',true).order('created_at').limit(1));
const user=db(await service.auth.admin.getUserById(staff[0].user_id)).user;
const link=db(await service.auth.admin.generateLink({type:'magiclink',email:user.email}));
const jar=new Map();
const session=createServerClient(url,key,{cookies:{getAll:()=>[...jar.values()].map(({name,value})=>({name,value})),setAll:cookies=>cookies.forEach(cookie=>jar.set(cookie.name,cookie))}});
let browser;
const results=[];
try{
 db(await session.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));
 browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 const context=await browser.newContext();
 await context.addCookies([...jar.values()].map(({name,value})=>({name,value,url:base,sameSite:'Lax'})));
 const page=await context.newPage();page.setDefaultNavigationTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 if(process.argv.includes('--local-review')){
  await page.goto(base+'/');await page.waitForURL(/\/admin\/vista-previa\/paginas\//);
  await page.getByRole('heading',{name:'Recuperar tu vida es posible',exact:true}).waitFor();
  assert.deepEqual((await page.locator('#navigation-tratamiento a').allTextContents()).map(label=>label.trim()),['Tratamientos','Ambulatorio intensivo','Tratamiento individual']);
 }
 const saveMenuLabels=process.argv.includes('--save-menu-labels');
 if(saveMenuLabels){
  await page.goto(base+'/admin/configuracion');
  for(const [previous,next] of [['Nuestros tratamientos','Tratamientos'],['Familia y recuperación','Familias']]){
   const field=page.locator(`input[value="${previous}"]`);
   if(await field.count())await field.fill(next);
  }
  await page.getByRole('button',{name:'Guardar borrador',exact:true}).click();
  await page.waitForURL(/success=saved/);
  await page.getByText('Configuración guardada.',{exact:true}).waitFor();
 }
 for(const width of [1440,375]){
  await page.setViewportSize({width,height:900});
  for(const path of ['/admin/paginas/revision','/admin/paginas/nueva','/admin/configuracion',`/admin/paginas/${imported.pages[0].id}`,`/admin/equipo/${imported.professionals[0].id}`]){
   const response=await page.goto(base+path);assert.equal(response.status(),200,path);
   await page.locator('h1').waitFor();
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${path}: overflow ${width}`);
   results.push({path,width,status:200});
  }
  for(const item of (smoke?imported.pages.slice(0,1):imported.pages)){
   const response=await page.goto(`${base}/admin/vista-previa/paginas/${item.id}`);assert.equal(response.status(),200,item.path);
   await page.locator('h1').waitFor();await page.waitForLoadState('load');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(150);
   const metrics=await page.evaluate(()=>({h1:document.querySelectorAll('h1').length,overflow:document.documentElement.scrollWidth>innerWidth+1,broken:[...document.images].filter(i=>i.complete&&i.naturalWidth===0).length,noindex:document.querySelector('meta[name="robots"]')?.content.includes('noindex')}));
   if(metrics.overflow){await page.screenshot({path:`tmp/client-content-2026-11-06/overflow-${width}.png`,fullPage:true});console.log(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).slice(0,8).map(e=>({tag:e.tagName,class:e.className,right:e.getBoundingClientRect().right}))));}
   assert.equal(metrics.h1,1,item.path);assert.equal(metrics.overflow,false,`${item.path}: overflow ${width}`);assert.equal(metrics.broken,0,item.path);assert(metrics.noindex,item.path);
   if(smoke){
    const navigation=page.getByRole('navigation',{name:'Navegación principal',exact:true});
    if(await navigation.isVisible()){
     const trigger=navigation.getByRole('button').first();await trigger.hover();await page.waitForFunction(()=>document.querySelector('.public-header__navigation button[aria-expanded="true"]'));
     await page.mouse.move(0,0);await page.waitForTimeout(400);
    }else{
     await page.getByRole('button',{name:'Abrir menú',exact:true}).click();await page.locator('dialog[open]').waitFor();await page.keyboard.press('Escape');await page.locator('dialog[open]').waitFor({state:'hidden'});
    }
   }
   assert.equal(await page.getByRole('link',{name:'Recovery 40',exact:true}).count(),0,'La propuesta del Word no debe incluir Recovery 40');
   const subtitle=page.locator('.cms-hero__subtitle');
   if(await subtitle.count()){assert(await subtitle.isVisible());assert((await subtitle.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)))>=20);}
   if(item.path==='/recovery-90'){
    assert(await page.getByText('Actualmente no está disponible para recibir participantes.',{exact:false}).count());
    assert(await page.getByText('Inspirado en la experiencia y trayectoria internacional de Instituto Castelao España, nuestro propósito es desarrollar en Chile una propuesta que refleje sus principios de calidad, profesionalismo y acompañamiento humano.',{exact:true}).count());
   }
   if(item.path==='/equipo')for(const name of ['Daniela Núñez','Dra. María Pía Gatica','Gonzalo Egas'])assert(await page.getByRole('heading',{name,exact:true}).count());
   results.push({path:item.path,width,...metrics});
   if(['/','/recovery-90','/equipo'].includes(item.path))await page.screenshot({path:`tmp/client-content-2026-11-06/preview-${item.path==='/'?'inicio':item.path.slice(1)}-${width}.png`,fullPage:true});
  }
  if(!smoke)for(const item of imported.professionals){
   const response=await page.goto(`${base}/admin/vista-previa/equipo/${item.id}`);assert.equal(response.status(),200,item.slug);
   await page.locator('h1').waitFor();
   assert.equal(await page.locator('h1').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,item.slug);
   const back=page.getByRole('link',{name:'Volver al equipo',exact:true});assert((await back.getAttribute('href')).startsWith('/admin/vista-previa/paginas/'));
   results.push({path:`/equipo/${item.slug}`,width,status:200});
  }
 }
 assert.deepEqual(errors,[]);
 const anonymous=await browser.newContext();
 for(const path of ['/quienes-somos','/tratamientos/individual','/recovery-90']){const response=await anonymous.request.get(base+path);assert.equal(response.status(),404);}
 const guarded=await anonymous.request.get(`${base}/admin/vista-previa/paginas/${imported.pages[0].id}`,{maxRedirects:0});assert.equal(guarded.status(),307);assert(guarded.headers().location.includes('next='));
 await writeFile(`tmp/client-content-2026-11-06/browser-${smoke?'smoke':'results'}.json`,JSON.stringify({readOnly:!saveMenuLabels,editorialMenuSaved:saveMenuLabels,checks:results.length,results,anonymousDraftRoutesHidden:true,guardedPreview:true,errors},null,2));
 console.log(JSON.stringify({readOnly:!saveMenuLabels,editorialMenuSaved:saveMenuLabels,checks:results.length,anonymousDraftRoutesHidden:true,guardedPreview:true,errors}));
}finally{await browser?.close();await session.auth.signOut({scope:'local'});}
