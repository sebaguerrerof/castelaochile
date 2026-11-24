import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=fileURLToPath(new URL("../",import.meta.url));
const workspace=path.join(root,"tmp","patient-supabase-local");
const marker=path.join(workspace,"patient-qa.json");
const project="castelao-patient-qa";
const cli=path.join(root,"node_modules","supabase","dist","supabase.js");
const action=process.argv[2] ?? "help";
if(process.platform==="win32" && process.env.LOCALAPPDATA){
  const dockerDirectory=path.join(process.env.LOCALAPPDATA,"Programs","DockerDesktop","resources","bin");
  if(existsSync(path.join(dockerDirectory,"docker.exe"))) process.env.PATH=dockerDirectory+path.delimiter+(process.env.PATH ?? "");
}

// No dotenv loading, remote project link, reset, db push, or credentials on stdout.
async function run(file,args,options={}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(file,args,{cwd:root,windowsHide:true,stdio:options.capture ? [options.input ? "pipe" : "ignore","pipe","pipe"] : "inherit",env:options.env ?? process.env});
    let output="";
    if(options.capture){child.stdout.on("data",data=>{output+=data;});child.stderr.on("data",()=>{});}
    if(options.input) child.stdin.end(options.input);
    child.on("error",reject);
    child.on("close",code=>code===0 ? resolve(output) : reject(new Error(options.capture ? "El stack local no está disponible. Ejecuta patient:local:start y comprueba Docker Desktop." : `El proceso local terminó con código ${code}.`)));
  });
}
async function owned() {
  const data=JSON.parse(await readFile(marker,"utf8"));
  assert.equal(data.project,project,"El directorio no corresponde al stack de QA.");
  const config=await readFile(path.join(workspace,"supabase","config.toml"),"utf8");
  assert.match(config,/^project_id = "castelao-patient-qa"$/m);
  return config;
}
async function prepare() {
  await mkdir(workspace,{recursive:true});
  const configuration=path.join(workspace,"supabase","config.toml");
  let existing=false;
  try {await readFile(configuration);existing=true;} catch(error) {if(error.code!=="ENOENT") throw error;}
  if(existing) await owned();
  let config=await readFile(path.join(root,"supabase","config.toml"),"utf8");
  config=config.replace(/^project_id = .+$/m,`project_id = "${project}"`)
    .replace(/^site_url = .+$/m,'site_url = "http://localhost:3441"')
    .replace(/\b543(\d\d)\b/g,"544$1")
    .replace(/(\[db\.seed\][\s\S]*?\nenabled = )true/,"$1false")
    .replace(/^email_sent = \d+$/m,"email_sent = 20");
  assert.match(config,/\[local_smtp\]\s*\nenabled = true/);
  assert.doesNotMatch(config,/^\[auth\.email\.smtp\]/m,"No se admite un SMTP externo en el stack de QA.");
  await cp(path.join(root,"supabase","migrations"),path.join(workspace,"supabase","migrations"),{recursive:true});
  await cp(path.join(root,"supabase","templates"),path.join(workspace,"supabase","templates"),{recursive:true});
  await writeFile(configuration,config);
  await writeFile(marker,JSON.stringify({project,api:"http://127.0.0.1:54421",mail:"http://127.0.0.1:54424",app:"http://localhost:3441"},null,2));
  console.log("QA preparada: proyecto separado, puertos 544xx, correo capturado localmente, sin seed ni enlace remoto.");
}
async function status() {
  await owned();
  const result=JSON.parse(await run(process.execPath,[cli,"status","--workdir",workspace,"--output","json"],{capture:true}));
  const url=result.API_URL ?? result.api_url;
  assert.equal(new URL(url).origin,"http://127.0.0.1:54421","Solo se admite el API del stack de QA.");
  return {url,key:result.PUBLISHABLE_KEY ?? result.ANON_KEY,secret:result.SECRET_KEY ?? result.SERVICE_ROLE_KEY};
}

try {
  if(action==="prepare") await prepare();
  else if(action==="start") {
    await prepare();
    await run(process.execPath,[cli,"start","--workdir",workspace,"--exclude","studio,postgres-meta,edge-runtime,logflare,vector,supavisor,realtime,imgproxy"],{capture:true});
    console.log("Supabase QA iniciado. API: http://127.0.0.1:54421 · Correo capturado: http://127.0.0.1:54424. Claves ocultas.");
  } else if(action==="stop") {
    await owned();
    await run(process.execPath,[cli,"stop","--workdir",workspace]);
  } else if(action==="db-test") {
    await owned();
    const sql=await readFile(path.join(root,"supabase","tests","patient_library_rls_test.sql"),"utf8");
    const output=await run("docker",["exec","-i",`supabase_db_${project}`,"psql","-X","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1","-P","pager=off"],{capture:true,input:sql});
    assert.match(output,/ROLLBACK/);
    const count=[...sql.matchAll(/^select pg_temp.library_(assert|denied)\(/gm)].length;
    await mkdir(path.join(root,"tmp","patient-library-qa"),{recursive:true});
    await writeFile(path.join(root,"tmp","patient-library-qa","real-db.json"),JSON.stringify({status:"PASS",assertions:count,engine:"Supabase local PostgreSQL 17",rolledBack:true},null,2));
    console.log(`PASS: ${count} comprobaciones RLS en PostgreSQL real; fixtures retirados mediante rollback.`);
  } else if(action==="build" || action==="preview") {
    const {url,key,secret}=await status();
    assert.ok(key && secret,"No están disponibles las claves del stack local.");
    const env={...process.env,NEXT_PUBLIC_SUPABASE_URL:url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:key,SUPABASE_SECRET_KEY:secret,NEXT_PUBLIC_SITE_URL:"http://localhost:3400",NEXT_DIST_DIR:".next-patient-final",PATIENT_PORTAL_ENABLED:"true",PATIENT_AUTH_EMAILS_ENABLED:"false",ANALYTICS_ENABLED:"false",CONTACT_INTAKE_ENABLED:"false",UPSTASH_REDIS_REST_URL:"",UPSTASH_REDIS_REST_TOKEN:""};
    await run(process.execPath,[path.join(root,"node_modules","next","dist","bin","next"),...(action==="build" ? ["build"] : ["start","-p","3400"])],{env});
  } else if(action==="test") {
    const {url,key,secret}=await status();
    assert.ok(key && secret,"No están disponibles las claves del stack local.");
    try {
      await run(process.execPath,[path.join(root,"scripts","qa-patient-library-e2e.mjs")],{env:{...process.env,PATIENT_QA_SUPABASE_URL:url,PATIENT_QA_PUBLISHABLE_KEY:key,PATIENT_QA_SECRET_KEY:secret,PATIENT_QA_MAILPIT_URL:"http://127.0.0.1:54424",PATIENT_QA_EMAIL_CAPTURE:"true",PATIENT_QA_DEDICATED_CLEANUP:"true"}});
    } finally {
      await owned();
      assert.equal(new URL(url).origin,"http://127.0.0.1:54421");
      const pending=JSON.parse(await readFile(path.join(root,"tmp","patient-library-qa","pending-auth-cleanup.json"),"utf8"));
      assert.match(pending.run,/^[0-9a-f]{8}$/);
      assert.ok(Array.isArray(pending.ids) && pending.ids.length<=20);
      for(const id of pending.ids) assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
      if(pending.ids.length){
        const ids=pending.ids.map(id=>`'${id}'`).join(",");
        const predicate=`id in (${ids}) and email like 'portal-qa-${pending.run}-%@example.test'`;
        const sql=`begin; alter table public.admin_users disable trigger protect_last_active_superadmin; delete from auth.users where ${predicate}; alter table public.admin_users enable trigger protect_last_active_superadmin; do $$ begin if exists(select 1 from auth.users where ${predicate}) then raise exception 'QA cleanup incomplete'; end if; end $$; commit;`;
        await run("docker",["exec","-i",`supabase_db_${project}`,"psql","-X","-U","postgres","-d","postgres","-v","ON_ERROR_STOP=1"],{capture:true,input:sql});
        await writeFile(path.join(root,"tmp","patient-library-qa","pending-auth-cleanup.json"),JSON.stringify({run:pending.run,ids:[],completed:true}));
        console.log("Cuentas de QA local retiradas; protección del último superadministrador restaurada en la misma transacción.");
      }
    }
  } else if(action==="status") {
    await status();console.log("Supabase QA disponible. API: http://127.0.0.1:54421 · Correo: http://127.0.0.1:54424. Claves ocultas.");
  } else console.log("Uso: node scripts/patient-local.mjs prepare|start|status|db-test|test|build|preview|stop. No ejecuta reset ni operaciones remotas.");
} catch(error) {console.error(error.message);process.exitCode=1;}
