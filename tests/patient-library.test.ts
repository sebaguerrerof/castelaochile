import assert from "node:assert/strict";
import test from "node:test";
import { deflateRawSync } from "node:zlib";
import { materialSchema,hasLibraryCapability,internalPatientDestination,sameOrigin,searchFilters } from "../src/lib/patient-library/policy.ts";
import { sanitizeTherapeuticHtml } from "../src/lib/patient-library/html.ts";
import { safeFilename,contentDisposition,validateAttachment,maximumAttachmentBytes,declaredAttachment } from "../src/lib/patient-library/files.ts";
import { readLibraryJson } from "../src/lib/patient-library/http.ts";
import { analyticsEventSchema } from "../src/lib/analytics-policy.ts";

const id="20000000-0000-4000-8000-000000000001";
const base={id:"",version:0,title:"Texto de prueba",description:"",area_id:id,folder_id:"",kind:"guide",body:"<p>Prueba local.</p>",tags:[],session_date:"",audience:"all",patients:[],groups:[],status:"draft",confirm_audience:false,confirm_publish:false};
test("reports require exactly one explicit patient and incompatible audiences fail",()=>{
  assert.ok(materialSchema.safeParse(base).success);
  assert.equal(materialSchema.safeParse({...base,kind:"report"}).success,false);
  assert.equal(materialSchema.safeParse({...base,kind:"report",audience:"groups",groups:[id]}).success,false);
  assert.equal(materialSchema.safeParse({...base,kind:"report",audience:"patients",patients:[id,id]}).success,false);
  assert.ok(materialSchema.safeParse({...base,kind:"report",audience:"patients",patients:[id]}).success);
  assert.equal(materialSchema.safeParse({...base,patients:[id]}).success,false);
});
test("capabilities are independent and content management implies therapeutic read",()=>{
  assert.equal(hasLibraryCapability(null,"read"),false);
  const access={manage_access:true,manage_content:false,read_content:false};
  assert.equal(hasLibraryCapability(access,"read"),false);assert.equal(hasLibraryCapability(access,"access"),true);
  assert.equal(hasLibraryCapability({...access,manage_content:true},"read"),true);
});
test("login destinations and mutation origins reject external redirects",()=>{
  for(const value of ["//evil.test","https://evil.test","/pacientes/../admin","/pacientes%2f..%2fadmin","/pacientes\\evil","/admin","/pacientes?next=https://evil.test"]){assert.equal(internalPatientDestination(value),"/pacientes");}
  assert.equal(internalPatientDestination("/pacientes/favoritos"),"/pacientes/favoritos");
  assert.equal(sameOrigin("https://evil.test","https://instituto.example"),false);
  assert.equal(sameOrigin(null,"https://instituto.example"),false);
  assert.equal(sameOrigin("https://instituto.example","https://instituto.example/a"),true);
});
test("search filters bound page size, validate IDs/dates and ignore bodies",()=>{
  assert.deepEqual(searchFilters({q:"  recurso  ",area:"forged",tipo:"script",pagina:"-2",desde:"2026-13-99"}),{q:"recurso",area:undefined,folder:undefined,kind_filter:undefined,date_from:undefined,date_to:undefined,page:1});
  assert.equal(searchFilters({pagina:"9999999"}).page,10000);
  assert.equal(searchFilters({q:"a".repeat(500)}).q.length,120);
});
test("private HTML cannot load images, scripts, external frames or tracker links",()=>{
  const result=sanitizeTherapeuticHtml('<h2 onclick="bad()">Guía</h2><p><a href="https://tracker.test">texto</a><img src="https://tracker.test/pixel"><iframe src="https://third-party.test"></iframe><script>bad()</script><strong>seguro</strong></p>');
  assert.equal(result,"<h2>Guía</h2><p>texto<strong>seguro</strong></p>");
});
test("public analytics rejects every portal and Auth flow",()=>{
  for(const path of ["/pacientes","/pacientes/login","/pacientes/activar","/pacientes/favoritos","/Pacientes/biblioteca","/auth/confirm","/api/pacientes/archivos/123"])
    assert.equal(analyticsEventSchema.safeParse({event:"page_view",eventId:id,path}).success,false,path);
});
test("filenames and disposition prevent header injection and path traversal",()=>{
  assert.equal(safeFilename("../../informe\r\nX-Test: bad.pdf"),"informe__X-Test_ bad.pdf");
  const h=contentDisposition('área "privada".pdf',true);
  assert.ok(h.startsWith("inline;"));assert.ok(h.includes("filename*=UTF-8''"));assert.equal(/[\r\n]/.test(h),false);
});
const pdf=Buffer.from("%PDF-1.7\n1 0 obj <<>> endobj\n%%EOF\n");
test("server detects file signature instead of trusting Content-Type or suffix",()=>{
  assert.equal(validateAttachment(pdf,"guía.pdf").mime,"application/pdf");
  for(const name of ["fake.png","fake.docx","malware.exe","drawing.svg","web.html","macro.docm"])
    assert.throws(()=>validateAttachment(pdf,name));
  assert.throws(()=>validateAttachment(Buffer.from("<html>fake</html>"),"fake.pdf"));
  assert.throws(()=>validateAttachment(Buffer.alloc(0),"empty.pdf"));
  assert.throws(()=>validateAttachment(pdf,"big.pdf",10));
  assert.throws(()=>validateAttachment(Buffer.alloc(maximumAttachmentBytes+1),"big.pdf"));
});
test("upload authorization only accepts declared supported metadata; readiness still requires bytes",()=>{
  assert.equal(declaredAttachment("guide.pdf",500).mime,"application/pdf");
  for(const [name,size] of [["file.html",50],["file.docm",50],["file.pdf",0],["file.pdf",maximumAttachmentBytes+1]] as const)assert.throws(()=>declaredAttachment(name,size));
});
test("private JSON requests are bounded independently of Content-Length",async()=>{
  assert.deepEqual(await readLibraryJson(new Request("http://localhost",{method:"POST",body:'{"id":"local"}'})),{id:"local"});
  await assert.rejects(()=>readLibraryJson(new Request("http://localhost",{method:"POST",body:"x".repeat(300)}),200));
  await assert.rejects(()=>readLibraryJson(new Request("http://localhost",{method:"POST",body:'{"id":"local"}',headers:{"Content-Length":"1"}}),5));
});
// Minimal package builder used exclusively for bounded ZIP validation tests.
function officeZip(extra:Record<string,string>={}) {
  const files={"[Content_Types].xml":'<Types><Override ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',"word/document.xml":"<document/>","_rels/.rels":"<Relationships/>",...extra};
  const locals:Buffer[]=[],directory:Buffer[]=[];let offset=0;
  for(const [name,value] of Object.entries(files)){
    const n=Buffer.from(name),raw=Buffer.from(value),compressed=deflateRawSync(raw);const l=Buffer.alloc(30);l.writeUInt32LE(0x04034b50);l.writeUInt16LE(8,8);l.writeUInt32LE(compressed.length,18);l.writeUInt32LE(raw.length,22);l.writeUInt16LE(n.length,26);
    locals.push(l,n,compressed);const d=Buffer.alloc(46);d.writeUInt32LE(0x02014b50);d.writeUInt16LE(8,10);d.writeUInt32LE(compressed.length,20);d.writeUInt32LE(raw.length,24);d.writeUInt16LE(n.length,28);d.writeUInt32LE(offset,42);directory.push(d,n);offset+=l.length+n.length+compressed.length;
  }
  const cd=Buffer.concat(directory),e=Buffer.alloc(22);e.writeUInt32LE(0x06054b50);e.writeUInt16LE(Object.keys(files).length,8);e.writeUInt16LE(Object.keys(files).length,10);e.writeUInt32LE(cd.length,12);e.writeUInt32LE(offset,16);return Buffer.concat([...locals,cd,e]);
}
test("Office ZIP inspection validates content, rejects macros, encrypted paths and external references",()=>{
  assert.equal(validateAttachment(officeZip(),"guide.docx").mime,"application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.throws(()=>validateAttachment(officeZip(),"wrong.xlsx"));
  assert.throws(()=>validateAttachment(officeZip({"word/vbaProject.bin":"macro"}),"macro.docx"));
  assert.throws(()=>validateAttachment(officeZip({"../escape":"bad"}),"traversal.docx"));
  assert.throws(()=>validateAttachment(officeZip({"word/_rels/document.xml.rels":'<Relationship TargetMode="External" Target="https://tracker.test"/>'}),"remote.docx"));
  const malformed=officeZip();malformed[0]=0;assert.throws(()=>validateAttachment(malformed,"bad.docx"));
});
