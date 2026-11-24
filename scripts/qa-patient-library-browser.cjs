/* Local visual fixtures only; this harness is never imported by the application. */
const assert=require("node:assert/strict");
const fs=require("node:fs");const path=require("node:path");const http=require("node:http");const Module=require("node:module");
const React=require("react");const {renderToStaticMarkup}=require("react-dom/server");const ts=require("typescript");
const runtime=process.env.CODEX_NODE_MODULES ?? "C:/Users/sebag/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules";
const {chromium}=require(require.resolve("playwright",{paths:[runtime]}));
const root=path.resolve(".");const base=process.env.PATIENT_QA_BASE_URL ?? "http://localhost:3400";
assert.ok(["localhost","127.0.0.1"].includes(new URL(base).hostname),"QA is local only");
const output="tmp/patient-library-qa";fs.mkdirSync(output,{recursive:true});
const area="70000000-0000-4000-8000-000000000001",folder="70000000-0000-4000-8000-000000000002";
const areas=[{id:area,name:"Terapia grupal",sort_order:1,is_active:true}];
const folders=[{id:folder,name:"Recursos de sesión",area_id:area,parent_id:null,sort_order:0,is_active:true}];
const rows=Array.from({length:3},(_,i)=>({id:`70000000-0000-4000-8000-00000000000${i+3}`,title:["Guía de prueba local","Actividad de prueba local","Recurso con un título largo para comprobar el ajuste de líneas en móvil"][i],description:"Contenido neutro usado exclusivamente para revisar la presentación de los componentes.",kind:["guide","activity","exercise"][i],area_id:area,folder_id:null,session_date:"2026-10-08",updated_at:"2026-10-08T12:00:00Z",status:"published",version:1,favorite:i===1,is_new:i===0,total_count:3}));
let routePath="/pacientes/biblioteca";let empty=false;
const mockClient={rpc:async name=>({error:null,data:name==="library_navigation" ? {areas,folders} : empty ? [] : rows})};
const load=Module._load;
Module._load=function(name,parent,isMain){
  if(name==="next/navigation")return {usePathname:()=>routePath,notFound:()=>{throw new Error("Not found");}};
  if(name==="next/link")return {__esModule:true,default:({prefetch,children,...p})=>React.createElement("a",p,children)};
  if(name==="next/image")return {__esModule:true,default:({preload,sizes,children,...p})=>React.createElement("img",p,children)};
  if(name==="@/lib/patient-library/server")return {requirePatientPage:async()=>({client:mockClient,patient:{id:area,display_name:"Paciente local"}})};
  if(name==="@/app/pacientes/actions")return Object.fromEntries(["patientLogout","patientFavorite","patientLogin","patientPassword","patientRecovery"].map(k=>[k,async()=>({ok:true,message:"Prueba visual"})]));
  if(name.startsWith("@/"))return load.call(this,path.join(root,"src",name.slice(2)),parent,isMain);
  return load.call(this,name,parent,isMain);
};
for(const ext of [".ts",".tsx"])require.extensions[ext]=(mod,file)=>mod._compile(ts.transpileModule(fs.readFileSync(file,"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {PatientShell}=require("../src/components/patient-library/patient-shell.tsx");
const {LibraryBrowser}=require("../src/components/patient-library/library-browser.tsx");
const {MaterialDetail}=require("../src/components/patient-library/material-detail.tsx");
const styles=fs.readFileSync("src/app/pacientes/portal.css","utf8")+"\n"+fs.readFileSync("src/app/(public)/public-content.css","utf8");
async function fixture(url){
  empty=url.pathname==="/empty";const values=Object.fromEntries(url.searchParams);routePath="/pacientes/biblioteca";
  const content=url.pathname==="/detail" ? React.createElement(MaterialDetail,{detail:{material:{...rows[0],body:"<h2>Contenido de prueba</h2><p>Texto neutro para verificación visual y de lectura.</p>",tags:[]},attachments:[{id:rows[0].id,original_name:"Documento de prueba con nombre extenso.pdf",mime:"application/pdf",bytes:12000}]}}) : await LibraryBrowser({values});
  return "<!doctype html><html lang='es'><head><meta name='viewport' content='width=device-width, initial-scale=1'><title>QA local de componentes</title><style>body{margin:0}*{box-sizing:border-box}button,input,select{font:inherit}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden}h1,h2,h3,p{margin-top:0}"+styles+"</style></head><body>"+renderToStaticMarkup(React.createElement(PatientShell,{name:"Paciente local"},content))+"</body></html>";
}
const server=http.createServer(async(req,res)=>{try{if(req.url.startsWith("/brand/")){res.setHeader("Content-Type","image/png");res.end(fs.readFileSync(path.join(root,"public",req.url)));return;}res.setHeader("Content-Type","text/html; charset=utf-8");res.end(await fixture(new URL(req.url,"http://localhost")));}catch(e){res.statusCode=500;res.end(e.message);}});
const checks=[];
(async()=>{
  await new Promise(resolve=>server.listen(3401,"127.0.0.1",resolve));
  const browser=await chromium.launch({headless:true,executablePath:process.env.PATIENT_QA_CHROME ?? "C:/Program Files/Google/Chrome/Application/chrome.exe"});
  try{
    const page=await browser.newPage();const errors=[];const analytics=[];page.on("pageerror",e=>errors.push(e.message));page.on("request",r=>{if(r.url().includes("/api/analytics"))analytics.push(r.url());});
    for(const width of [320,375,768,1440]){
      await page.setViewportSize({width,height:900});const response=await page.goto(base+"/pacientes/login",{waitUntil:"networkidle"});assert.equal(response.status(),200);
      assert.ok(response.headers()["cache-control"].includes("no-store"));assert.ok(response.headers()["x-robots-tag"].includes("noindex"));
      assert.equal(await page.locator('meta[name="robots"]').getAttribute("content"),"noindex, nofollow, nocache");
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      await page.getByLabel("Correo electrónico",{exact:true}).fill("local@example.test");await page.keyboard.press("Tab");assert.equal(await page.locator('input[name="password"]').evaluate(e=>e===document.activeElement),true);
      await page.screenshot({path:`${output}/login-${width}.png`,fullPage:true});checks.push({surface:"live-login",width,status:"PASS"});
      for(const variant of ["/","/?vista=lista","/empty","/detail"]){
        await page.goto("http://127.0.0.1:3401"+variant,{waitUntil:"load"});assert.equal(await page.locator("h1").count(),1);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,`overflow ${width} ${variant}`);
        if(variant==="/"){await page.keyboard.press("Tab");assert.equal(await page.locator(".library-skip").evaluate(e=>e===document.activeElement),true);}
        await page.screenshot({path:`${output}/components-${variant==="/" ? "grid" : variant.includes("lista") ? "list" : variant.slice(1)}-${width}.png`,fullPage:true});checks.push({surface:"isolated-component-fixture",variant,width,status:"PASS"});
      }
    }
    await page.setViewportSize({width:320,height:900});
    await page.goto(base+"/pacientes/login?reason=invite-invalid",{waitUntil:"networkidle"});
    await page.getByRole("alert").filter({hasText:"El enlace no es válido"}).waitFor();
    assert.equal(await page.locator("details.library-recovery").evaluate(e=>e.open),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    checks.push({surface:"expired-invitation-recovery",width:320,status:"PASS"});
    for(const route of ["/pacientes","/pacientes/biblioteca","/pacientes/favoritos","/pacientes/perfil","/pacientes/materiales/70000000-0000-4000-8000-000000000003","/admin/biblioteca"]){const response=await fetch(base+route,{redirect:"manual"});assert.ok([307,308].includes(response.status),route);assert.ok(response.headers.get("location").includes("/login"));checks.push({surface:"live-unauthenticated-route",route,status:"PASS"});}
    for(const route of ["/api/pacientes/archivos/70000000-0000-4000-8000-000000000003","/api/pacientes/archivos/70000000-0000-4000-8000-000000000003?staff=1"]){const response=await fetch(base+route);assert.equal(response.status,404);assert.ok(response.headers.get("cache-control").includes("no-store"));assert.equal(await response.text(),"Recurso no disponible.");checks.push({surface:"live-unauthorized-download",route,status:"PASS"});}
    for(const route of ["/api/pacientes/adjuntos","/api/pacientes/adjuntos/70000000-0000-4000-8000-000000000003/finalizar","/api/pacientes/estado"]){const response=await fetch(base+route,{method:"POST",headers:{origin:"https://foreign.example"}});assert.ok([400,404].includes(response.status));checks.push({surface:"live-origin-rejection",route,status:"PASS"});}
    assert.deepEqual(analytics,[]);assert.deepEqual(errors,[]);checks.push({surface:"no-analytics-or-js-errors",status:"PASS"});
    await page.emulateMedia({reducedMotion:"reduce"});await page.goto("http://127.0.0.1:3401/");checks.push({surface:"reduced-motion",status:"PASS"});
    fs.writeFileSync(`${output}/browser.json`,JSON.stringify({checks,limitations:["Authenticated visual screens use isolated static component fixtures, not a mock application backend. Full Auth/Storage E2E requires local Supabase."]},null,2));console.log(`PASS: ${checks.length} browser/HTTP checks. Screenshots in ${output}.`);
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.message);server.close();process.exitCode=1;});
