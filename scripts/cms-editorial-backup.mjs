import {createClient} from '@supabase/supabase-js';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
if(!url||!process.env.SUPABASE_SECRET_KEY)throw new Error('Falta configuración de servidor.');
const client=createClient(url,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const snapshot={createdAt:new Date().toISOString(),origin:new URL(url).origin,tables:{}};
for(const name of ['cms_pages','cms_page_sections','professionals','site_settings','cms_editorial_drafts','cms_redirects']){
 const {data,error}=await client.from(name).select('*');
 if(error)throw new Error(`No se pudo respaldar ${name}: ${error.code}`);
 snapshot.tables[name]=data;
}
const payload=JSON.stringify(snapshot,null,2);
const directory=`tmp/cms-editorial-backups/${snapshot.createdAt.replace(/[:.]/g,'-')}`;
await mkdir(directory,{recursive:true});
await writeFile(`${directory}/cms.json`,payload);
await writeFile(`${directory}/sha256.txt`,createHash('sha256').update(payload).digest('hex'));
console.log(JSON.stringify({directory,counts:Object.fromEntries(Object.entries(snapshot.tables).map(([key,value])=>[key,value.length]))}));
