import assert from "node:assert/strict";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
process.on("uncaughtException",error=>{console.error(error.message, error.code ?? "", error.where ?? "");process.exitCode=1;});

// Optional isolated QA tool; installed in ignored tmp, never an application dependency.
const modulePath=process.env.PGLITE_MODULE ?? resolve("tmp/portal-tools/node_modules/@electric-sql/pglite/dist/index.js");
const {PGlite}=await import(pathToFileURL(modulePath).href);
const {unaccent}=await import(pathToFileURL(resolve("tmp/portal-tools/node_modules/@electric-sql/pglite/dist/contrib/unaccent.js")).href);
const db=new PGlite({extensions:{unaccent}});
await db.exec(`
create role anon; create role authenticated; create role service_role bypassrls;
create schema auth; create schema storage; create schema private; create schema extensions;
create table auth.users(id uuid primary key,email text unique);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated,anon,service_role; grant execute on function auth.uid() to authenticated,anon,service_role;
create function auth.role() returns text language sql stable as $$ select current_user::text $$;
create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
alter table storage.objects enable row level security;
grant usage on schema storage to authenticated,anon;
grant select,insert,update,delete on storage.objects to authenticated,anon;
-- Deliberately broad existing policy: therapeutic restrictive policy must still deny access.
create policy broad_existing on storage.objects for all to authenticated,anon using(true) with check(true);
create function storage.foldername(name text) returns text[] language sql immutable as $$ select (string_to_array(name,'/'))[1:array_length(string_to_array(name,'/'),1)-1] $$;
`);
const baseline=(await readdir("supabase/migrations")).filter(name=>name.endsWith(".sql") && name<"20261005000000").sort();
for(const name of baseline) await db.exec(await readFile(`supabase/migrations/${name}`,"utf8"));
const sql=await readFile("supabase/migrations/20261008142003_patient_library.sql","utf8");
await db.exec(sql);
const results=[];
try {
  const script=await readFile("supabase/tests/patient_library_rls_test.sql","utf8");
  const executed=await db.exec(script);
  for(const result of executed)for(const row of result.rows ?? [])if(row.assertion)results.push(row.assertion);
  assert.ok(results.length>=45,`Only ${results.length} assertions executed`);
  console.log(`PASS: ${baseline.length} existing migrations + library migration + ${results.length} PostgreSQL isolation/integrity assertions (PGlite).`);
  await mkdir("tmp/patient-library-qa",{recursive:true});
  await writeFile("tmp/patient-library-qa/database.json",JSON.stringify({engine:"PGlite PostgreSQL",baselineMigrations:baseline,assertions:results,status:"PASS",limitations:["Supabase Auth, PostgREST and Storage HTTP services are not provided by PGlite.","The two October analytics migrations require pg_cron and are unrelated to the library; they are not executed in PGlite."]},null,2));
} finally {await db.close();}
