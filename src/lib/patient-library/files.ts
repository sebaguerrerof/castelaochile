import { inflateRawSync } from "node:zlib";
import * as CFB from "cfb";

export const maximumAttachmentBytes=20*1024*1024;
const officeMime={docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation"} as const;
export function declaredAttachment(name:string,size:number,limit=maximumAttachmentBytes) {
  const original_name=safeFilename(name),ext=original_name.split(".").pop()?.toLowerCase() ?? "";
  const types:Record<string,string>={...officeMime,doc:"application/msword",pdf:"application/pdf",jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp"};
  if(!types[ext] || !Number.isInteger(size) || size<1 || size>Math.min(limit,maximumAttachmentBytes))throw new Error("Formato o tamaño no admitido.");
  return {original_name,mime:types[ext],bytes:size};
}
export function attachmentLimit() {
  const n=Number(process.env.PATIENT_LIBRARY_MAX_FILE_MB ?? 20);
  return Math.floor(Math.min(20,Number.isFinite(n) && n>0 ? n : 20)*1024*1024);
}
export function safeFilename(value: string) {
  const base=value.split(/[\\/]/).pop() ?? "archivo";
  return base.normalize("NFKC").replace(/[^\p{L}\p{N} ._()-]/gu,"_").replace(/^\.+/,"").slice(0,160) || "archivo";
}
export function contentDisposition(name: string, inline=false) {
  const safe=safeFilename(name);
  const ascii=safe.replace(/[^\x20-\x7e]/g,"_").replace(/["\\]/g,"_");
  return `${inline ? "inline" : "attachment"}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(safe).replace(/['()*]/g,c=>`%${c.charCodeAt(0).toString(16).toUpperCase()}`)}`;
}

/** Bounded central-directory inspection; no filesystem extraction and no macro formats. */
function validateOfficeZip(b: Buffer,ext: keyof typeof officeMime) {
  let end=-1;
  for (let i=b.length-22;i>=Math.max(0,b.length-65557);i--) if(b.readUInt32LE(i)===0x06054b50 && i+22+b.readUInt16LE(i+20)===b.length) {end=i;break;}
  if(end<0 || b.readUInt16LE(end+4)!==0 || b.readUInt16LE(end+6)!==0) throw new Error("Documento Office no válido.");
  const count=b.readUInt16LE(end+10),size=b.readUInt32LE(end+12),start=b.readUInt32LE(end+16);
  if(!count || count>2000 || count!==b.readUInt16LE(end+8) || start+size!==end) throw new Error("Documento Office fuera de límites.");
  let pos=start,total=0;
  const entries=new Map<string,{offset:number;packed:number;unpacked:number;method:number}>();
  for(let i=0;i<count;i++) {
    if(pos+46>end || b.readUInt32LE(pos)!==0x02014b50) throw new Error("Directorio ZIP no válido.");
    const flags=b.readUInt16LE(pos+8),method=b.readUInt16LE(pos+10),packed=b.readUInt32LE(pos+20),unpacked=b.readUInt32LE(pos+24);
    const length=b.readUInt16LE(pos+28),extra=b.readUInt16LE(pos+30),comment=b.readUInt16LE(pos+32),offset=b.readUInt32LE(pos+42);
    if(pos+46+length+extra+comment>end) throw new Error("ZIP truncado.");
    const name=b.subarray(pos+46,pos+46+length).toString("utf8");
    if(flags&1 || ![0,8].includes(method) || /(^\/|\\|(^|\/)\.\.?($|\/)|vba|macros?|\.bin$|\.exe$|\.js$|\.html?$|\.svg$)/i.test(name) || entries.has(name)) throw new Error("Documento cifrado, activo o no admitido.");
    total+=unpacked;
    if(unpacked>30*1024*1024 || total>100*1024*1024 || unpacked>Math.max(packed,1)*200 || offset+30>start || b.readUInt32LE(offset)!==0x04034b50) throw new Error("ZIP fuera de límites.");
    const localLength=b.readUInt16LE(offset+26),localExtra=b.readUInt16LE(offset+28);
    const dataOffset=offset+30+localLength+localExtra;
    if(b.subarray(offset+30,offset+30+localLength).toString("utf8")!==name || dataOffset+packed>start || b.readUInt16LE(offset+8)!==method || b.readUInt16LE(offset+6)!==flags) throw new Error("Cabecera ZIP inconsistente.");
    entries.set(name,{offset:dataOffset,packed,unpacked,method});
    pos+=46+length+extra+comment;
  }
  if(pos!==end) throw new Error("Directorio ZIP inconsistente.");
  const main={docx:"word/document.xml",xlsx:"xl/workbook.xml",pptx:"ppt/presentation.xml"}[ext];
  if(!entries.has(main) || !entries.has("[Content_Types].xml") || !entries.has("_rels/.rels")) throw new Error("El contenido no coincide con la extensión Office.");
  const readXml=(name:string) => {
    const e=entries.get(name)!;
    if(e.unpacked>1024*1024) throw new Error("Metadatos Office demasiado grandes.");
    const data=b.subarray(e.offset,e.offset+e.packed);
    const xml=e.method===0 ? data : inflateRawSync(data,{maxOutputLength:1024*1024});
    if(xml.length!==e.unpacked) throw new Error("XML Office truncado.");
    return xml.toString("utf8");
  };
  const types=readXml("[Content_Types].xml");
  const expected={docx:"wordprocessingml.document.main+xml",xlsx:"spreadsheetml.sheet.main+xml",pptx:"presentationml.presentation.main+xml"}[ext];
  if(!types.includes(expected) || /macroEnabled|vba|<!DOCTYPE|<!ENTITY/i.test(types)) throw new Error("Formato Office activo o incorrecto.");
  for(const name of entries.keys()) if(name.endsWith(".rels")) {
    const rels=readXml(name);
    if(/TargetMode\s*=\s*["']External["']|<!DOCTYPE|<!ENTITY/i.test(rels)) throw new Error("El documento contiene referencias externas. Guarda una copia sin vínculos externos.");
  }
  return { names: [...entries.keys()], readXml };
}
export function officeXmlEntries(bytes: Uint8Array, extension: "docx" | "xlsx" | "pptx") {
  return validateOfficeZip(Buffer.from(bytes), extension);
}
function validateLegacyWord(b: Buffer) {
  if (b.length < 512 || !b.subarray(0, 8).equals(Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]))) throw new Error("Documento DOC no válido.");
  const container = CFB.read(b, { type: "buffer" });
  if (container.FileIndex.length > 2000 || container.FullPaths.some(path => /(?:^|\/)(?:VBA|Macros|_VBA_PROJECT|ObjectPool|EncryptionInfo|EncryptedPackage)(?:\/|$)/i.test(path))) throw new Error("Usa un documento Word sin macros, objetos incrustados ni cifrado.");
  const word = CFB.find(container, "WordDocument");
  const stream = word?.content ? Buffer.from(word.content) : null;
  if (!stream || stream.length < 32 || stream.readUInt16LE(0) !== 0xa5ec || stream.readUInt16LE(10) & 0x8100 || !CFB.find(container, stream.readUInt16LE(10) & 0x0200 ? "1Table" : "0Table")) throw new Error("Usa un DOC de Word 97 o posterior, sin contraseña.");
}
export function validateAttachment(bytes: Uint8Array,name: string,limit=maximumAttachmentBytes) {
  const b=Buffer.from(bytes);
  if(!b.length || b.length>Math.min(limit,maximumAttachmentBytes)) throw new Error("El archivo está vacío o supera el límite permitido.");
  const clean=safeFilename(name),ext=clean.split(".").pop()?.toLowerCase();
  let mime:string | undefined;
  if(ext==="doc") { validateLegacyWord(b); mime="application/msword"; }
  if(ext==="pdf" && b.subarray(0,5).toString()==="%PDF-" && b.subarray(Math.max(0,b.length-2048)).includes(Buffer.from("%%EOF"))) mime="application/pdf";
  if(ext==="png" && b.length>=33 && b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && b.subarray(12,16).toString()==="IHDR" && b.includes(Buffer.from("IEND"))) mime="image/png";
  if(["jpg","jpeg"].includes(ext ?? "") && b.length>=12 && b[0]===255 && b[1]===216 && b[2]===255 && b[b.length-2]===255 && b[b.length-1]===217) mime="image/jpeg";
  if(ext==="webp" && b.length>=20 && b.subarray(0,4).toString()==="RIFF" && b.subarray(8,12).toString()==="WEBP" && b.readUInt32LE(4)+8===b.length) mime="image/webp";
  if(ext && ext in officeMime && b.length>=22 && b.readUInt32LE(0)===0x04034b50) { validateOfficeZip(b,ext as keyof typeof officeMime); mime=officeMime[ext as keyof typeof officeMime]; }
  if(!mime) throw new Error("Usa PDF, DOC, DOCX, XLSX, PPTX, JPEG, PNG o WebP. La firma debe coincidir con la extensión.");
  return {original_name:clean,mime,bytes:b.length};
}
