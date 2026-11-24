import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {readFile,writeFile} from 'node:fs/promises';
const base=process.argv[2]??'https://castelaochile-ge8mmylia-sebastian-guerreros-projects.vercel.app';
assert.match(base,/^https:\/\/castelaochile-[a-z0-9]+-sebastian-guerreros-projects\.vercel\.app$/);
const cli='C:/Users/sebag/AppData/Roaming/npm/node_modules/vercel/dist/vc.js';
const postflight=JSON.parse(await readFile('tmp/care-production/demo-postflight.json','utf8')).rows[0].postflight;const token=postflight.batch.id.slice(0,8);
const checks=[];
const cases=[['/',200],['/admin/login',200],['/pacientes/login',200],['/manifest.webmanifest',200],['/admin/demostracion',307],['/admin/biblioteca',307],['/admin/seguimiento',307],['/admin/seguimiento/mi-trabajo',307],['/admin/seguimiento/agenda',307],['/admin/seguimiento/agenda?profesional='+postflight.batch.summary.coach_id+'&dias=30',307],['/admin/analitica?demo='+postflight.batch.id,307],['/blog/demo-'+token+'-contenido-1',404],['/noticias/demo-'+token+'-contenido-3',404],['/equipo/demo-'+token+'-profesional-1',404],['/demo-'+token,404]];
for(const[path,status]of cases){
 const file='tmp/care-production/demo-candidate-body-'+checks.length+'.txt';
 const output=await new Promise((resolve,reject)=>execFile(process.execPath,[cli,'curl',path,'--deployment',base,'--scope','sebastian-guerreros-projects','--','--silent','--output',file,'--write-out','%{http_code}'],{windowsHide:true},(error,stdout)=>error?reject(Error('No fue posible comprobar el candidato por Vercel curl.')):resolve(stdout.trim())));
 const actual=Number(output);const body=await readFile(file,'utf8');
 if(status===404){assert.ok([200,404].includes(actual),path);assert.ok(body.includes('Error 404')&&body.includes('noindex'),path+' unavailable and non-indexable');}
 else assert.equal(actual,status,path);
 assert.ok(!/Application error|Something went wrong/.test(body),path);checks.push({path,status:actual,...(status===404?{unavailable:true,nonIndexable:true}:{})});
}
await writeFile(process.argv[3]??'tmp/care-production/demo-candidate-http.json',JSON.stringify({status:'PASS',at:new Date().toISOString(),base,checks,access:'Vercel CLI protection bypass; anonymous app session'},null,2));console.log(`PASS ${checks.length} candidate HTTP checks`);
