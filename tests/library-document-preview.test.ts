import assert from "node:assert/strict";
import test from "node:test";
import * as CFB from "cfb";
import {documentPreview} from "../src/lib/patient-library/document-preview.ts";
import {declaredAttachment,validateAttachment} from "../src/lib/patient-library/files.ts";
import {officeFixture} from "./helpers/library-fixtures.ts";

test("DOCX reader escapes active text and reads paragraphs",async()=>{
  const result=await documentPreview(officeFixture("docx"),"neutral.docx");
  assert.match(result.html,/Lectura privada de Word QA/);assert.match(result.html,/&lt;script&gt;/);assert.doesNotMatch(result.html,/<script>/);
});
test("Office reading rejects external relationships before parsing",async()=>{
  await assert.rejects(documentPreview(officeFixture("docx",true),"external.docx"),/referencias externas/);
});
test("Excel reading preserves empty cell positions",async()=>{
  const result=await documentPreview(officeFixture("xlsx"),"neutral.xlsx");assert.match(result.html,/<td>Lectura Excel QA<\/td><td><\/td><td>42<\/td>/);
});
test("PowerPoint reading exposes slide text without active objects",async()=>{
  const result=await documentPreview(officeFixture("pptx"),"neutral.pptx");assert.match(result.html,/Diapositiva 1/);assert.match(result.html,/Lectura PowerPoint QA/);
});
test("Legacy DOC declaration requires genuine Word OLE and rejects macro streams",()=>{
  assert.equal(declaredAttachment("word.doc",1024).mime,"application/msword");
  assert.throws(()=>validateAttachment(Buffer.from("not a Word file"),"word.doc"),/DOC no válido/);
  const container=CFB.utils.cfb_new();CFB.utils.cfb_add(container,"Macros/VBA",Buffer.from("blocked"));
  assert.throws(()=>validateAttachment(Buffer.from(CFB.write(container,{type:"buffer",fileType:"cfb"})),"active.doc"),/sin macros/);
});
