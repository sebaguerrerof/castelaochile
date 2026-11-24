import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {pageEditSchema,professionalSchema,settingsSchema} from '../src/lib/cms/schemas.ts';
import {sanitizeBlogHtml} from '../src/lib/blog/content.ts';

const args=process.argv.slice(2);
const arg=name=>args.includes(name)?args[args.indexOf(name)+1]:null;
const apply=args.includes('--apply');
const input=arg('--file');
if(!input)throw new Error('Usa --file paquete.json; sin --apply solo se valida. El archivo no se importa desde la aplicación.');
const bundle=JSON.parse(await readFile(input,'utf8'));
const url=process.env.NEXT_PUBLIC_SUPABASE_URL, secret=process.env.SUPABASE_SECRET_KEY, key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if(!url||!secret||!key)throw new Error('Falta configuración de servidor.');
const service=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}});
function db(result){if(result.error)throw new Error(`CMS: ${result.error.code||'provider-error'} ${result.error.message}`);return result.data;}
const current={pages:db(await service.from('cms_pages').select('*')),sections:db(await service.from('cms_page_sections').select('*')),people:db(await service.from('professionals').select('*')),settings:db(await service.from('site_settings').select('*').eq('id','global').single())};
const normalizedPages=bundle.pages.map(proposal=>{
 const old=current.pages.find(page=>proposal.existingSlug?page.slug===proposal.existingSlug:page.path===proposal.path);
 if(proposal.existingSlug&&!old)throw new Error(`No existe la página a conservar: ${proposal.existingSlug}`);
 const sections=proposal.sections.map(block=>{
  const data={...block.data};
  if(block.section_type==='hero'&&!data.image&&old){const oldHero=current.sections.find(section=>section.page_id===old.id&&section.section_type==='hero');if(oldHero?.data.image)data.image=oldHero.data.image;}
  if(typeof data.html==='string')data.html=sanitizeBlogHtml(data.html);
  return {...block,data};
 });
 const {existingSlug,...content}=proposal;
 pageEditSchema.parse({...content,sections,id:old?.id??crypto.randomUUID(),updated_at:old?.updated_at??new Date().toISOString()});
 return {old,content:{...content,sections}};
});
const people=bundle.professionals.map(proposal=>{
 const old=current.people.find(person=>person.slug===(proposal.existingSlug??proposal.data.slug));
 const data={...proposal.data};
 if(old?.profile_image_url&&!data.profile_image_url){data.profile_image_url=old.profile_image_url;data.profile_image_alt=old.profile_image_alt;}
 for(const field of ['bio','professional_experience','recovery_experience'])data[field]=sanitizeBlogHtml(data[field]);
 return {old,data:professionalSchema.parse(data)};
});
const settings=settingsSchema.parse({...current.settings.data,...bundle.settings});
if(!apply){console.log(JSON.stringify({mode:'validation-only',origin:new URL(url).origin,pages:normalizedPages.length,newPages:normalizedPages.filter(page=>!page.old).length,blocks:normalizedPages.reduce((n,p)=>n+p.content.sections.length,0),professionals:people.length,newProfessionals:people.filter(person=>!person.old).length,settings:true}));process.exit(0);}
const backup=arg('--backup');if(!backup)throw new Error('La carga requiere --backup ruta/cms.json.');
const backupText=await readFile(backup,'utf8');const snapshot=JSON.parse(backupText);
assert.equal(snapshot.origin,new URL(url).origin,'El respaldo pertenece a otro entorno.');
const hash=await readFile(path.join(path.dirname(backup),'sha256.txt'),'utf8');assert.equal(createHash('sha256').update(backupText).digest('hex'),hash.trim());
const staff=db(await service.from('admin_users').select('user_id').eq('role','superadmin').eq('is_active',true).order('created_at').limit(1));
assert.equal(staff.length,1,'No hay una cuenta autorizada para la carga.');
const owner=db(await service.auth.admin.getUserById(staff[0].user_id));
assert(owner.user.email);
const link=db(await service.auth.admin.generateLink({type:'magiclink',email:owner.user.email}));
const session=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const result={source:bundle.source,origin:new URL(url).origin,pages:[],professionals:[],settings:false};
const report=path.join(path.dirname(input),'import-result.json');
const canonical=value=>JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).filter(([key])=>!['updated_at','draft_updated_at'].includes(key)).sort(([a],[b])=>a.localeCompare(b))):item);
async function stage(kind,id,data,base){
 const existing=db(await session.from('cms_editorial_drafts').select('data,updated_at').eq('kind',kind).eq('resource_id',id).maybeSingle());
 if(existing){if(canonical(existing.data)===canonical(data))return 'unchanged';throw new Error('Ya existe un borrador diferente. Se conserva para evitar sobrescribir cambios editoriales.');}
 db(await session.rpc('save_editorial_content',{p_kind:kind,p_id:id,p_data:data,p_base_updated_at:base,p_draft_updated_at:null,p_publish:false}));return 'staged';
}
try{
 db(await session.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'}));
 for(const proposal of normalizedPages){
  let row=proposal.old;
  if(!row){const id=db(await session.rpc('create_editorial_page',{p_title:proposal.content.title,p_path:proposal.content.path}));row=db(await session.from('cms_pages').select('*').eq('id',id).single());}
  const outcome=await stage('page',row.id,{...proposal.content,id:row.id,updated_at:row.updated_at},row.updated_at);
  result.pages.push({id:row.id,path:proposal.content.path,outcome});await writeFile(report,JSON.stringify(result,null,2));
 }
 for(const proposal of people){
  const row=proposal.old??db(await session.from('professionals').insert({...proposal.data,status:'draft'}).select('*').single());
  const outcome=await stage('professional',row.id,proposal.data,row.updated_at);
  result.professionals.push({id:row.id,slug:row.slug,outcome});await writeFile(report,JSON.stringify(result,null,2));
 }
 result.settings=await stage('settings','global',settings,current.settings.updated_at);await writeFile(report,JSON.stringify(result,null,2));
 console.log(JSON.stringify({mode:'private-drafts-only',pages:result.pages.length,professionals:result.professionals.length,settings:result.settings,report}));
}finally{await session.auth.signOut({scope:'local'});}
