import {readFile,writeFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
const input=process.argv[2];if(!input)throw new Error('Indica la extracción estructurada del documento fuente.');
const source=JSON.parse(await readFile(input,'utf8'));
const client=createClient(process.env.NEXT_PUBLIC_SUPABASE_URL,process.env.SUPABASE_SECRET_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await client.from('cms_editorial_drafts').select('kind,resource_id,data');if(error)throw error;
function strings(value){if(typeof value==='string')return [value];if(Array.isArray(value))return value.flatMap(strings);if(value&&typeof value==='object')return Object.values(value).flatMap(strings);return [];}
function normalize(text){return text.replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').normalize('NFKC').toLocaleLowerCase('es').replace(/\b(?:y|e)\b/g,' ').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');}
const values=data.filter(row=>row.kind!=='page'||row.data.status!=='archived').flatMap(row=>strings(row.data));
const haystack=normalize(values.join(' '));
const ranges=[[8,27],[42,56],[69,85],[94,107],[109,122],[140,161],[174,199],[212,232],[245,270],[283,309],[325,338],[351,370],[378,383]];
const expected=source.paragraphs.filter(p=>ranges.some(([from,to])=>p.paragraph>=from&&p.paragraph<=to));
const results=expected.map(p=>{const text=p.text.replace(/^(?:Botón(?: principal| secundario)?|Título SEO|Metadescripción|Dirección|WhatsApp|Correo):\s*/,'');const phone=/^\+?[\d\s]+$/.test(text.trim());const matched=phone?values.some(value=>/^\+?[\d\s]+$/.test(value.trim())&&value.replace(/\D/g,'')===text.replace(/\D/g,'')):haystack.includes(normalize(text));return {paragraph:p.paragraph,text,matched};});
const report={source:input,expected:results.length,matched:results.filter(p=>p.matched).length,missing:results.filter(p=>!p.matched),results};
await writeFile('tmp/client-content-2026-11-06/content-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({expected:report.expected,matched:report.matched,missing:report.missing}));
if(report.missing.length)process.exitCode=1;
