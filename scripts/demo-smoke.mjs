import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
const base=process.argv[2];assert.ok(base&&new URL(base).protocol==='https:');assert.ok(new URL(base).hostname==='www.castelaochile.cl'||/^castelaochile-[a-z0-9]+-sebastian-guerreros-projects\.vercel\.app$/.test(new URL(base).hostname));
const checks=[];
for(const path of['/','/blog','/noticias','/equipo','/contacto','/admin/login','/pacientes/login','/manifest.webmanifest']){
 const r=await fetch(base+path,{redirect:'manual'});assert.equal(r.status,200,path);const body=await r.text();assert.ok(!/Application error|Something went wrong/.test(body),path);checks.push({path,status:r.status});
}
for(const path of['/admin','/admin/demostracion','/admin/analitica?demo=f34f9ab0-649b-41b0-838a-5487a3a092bf','/admin/pacientes','/admin/biblioteca','/admin/usuarios','/admin/contenidos','/admin/paginas','/admin/equipo','/admin/consultas','/admin/grupos-terapeuticos','/admin/seguimiento','/admin/seguimiento/agenda','/admin/seguimiento/mi-trabajo','/admin/seguimiento/recovery','/admin/seguimiento/programaciones','/admin/seguimiento/informes','/pacientes/hoy','/pacientes/biblioteca']){
 const r=await fetch(base+path,{redirect:'manual'});assert.ok([302,303,307,308].includes(r.status),path);assert.match(r.headers.get('location')??'',/\/(admin|pacientes)\/login/);checks.push({path,status:r.status,private:true});
}
const postflight=JSON.parse(await readFile('tmp/care-production/demo-postflight.json','utf8')).rows[0].postflight;
const token=postflight.batch.id.slice(0,8);
for(const path of[`/blog/demo-${token}-contenido-1`,`/noticias/demo-${token}-contenido-3`,`/equipo/demo-${token}-profesional-1`,`/demo-${token}`]){
 const r=await fetch(base+path,{redirect:'manual'});const body=await r.text();assert.ok([200,404].includes(r.status),path);assert.ok(body.includes('Error 404')&&body.includes('noindex'),path+' unavailable and non-indexable');checks.push({path,status:r.status,draft:true,unavailable:true,nonIndexable:true});
}
const result={status:'PASS',at:new Date().toISOString(),base,checks};await writeFile(process.argv[3]??'tmp/care-production/demo-http.json',JSON.stringify(result,null,2));console.log(`PASS ${checks.length} HTTP checks: ${base}`);
