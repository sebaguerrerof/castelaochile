import * as CFB from "cfb";

export function officeFixture(kind:"docx"|"xlsx"|"pptx", malicious=false) {
  const main={docx:"word/document.xml",xlsx:"xl/workbook.xml",pptx:"ppt/presentation.xml"}[kind];
  const type={docx:"wordprocessingml.document.main+xml",xlsx:"spreadsheetml.sheet.main+xml",pptx:"presentationml.presentation.main+xml"}[kind];
  const container=CFB.utils.cfb_new();
  const add=(name:string,text:string)=>CFB.utils.cfb_add(container,name,Buffer.from(text));
  add("[Content_Types].xml",`<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/${main}" ContentType="application/vnd.openxmlformats-officedocument.${type}"/></Types>`);
  add("_rels/.rels",`<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="${malicious ? 'https://external.example/document.xml" TargetMode="External' : main}"/></Relationships>`);
  if(kind==="docx") add(main,'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Lectura privada de Word QA</w:t></w:r></w:p><w:p><w:r><w:t>&lt;script&gt;alert(1)&lt;/script&gt;</w:t></w:r></w:p></w:body></w:document>');
  if(kind==="xlsx") {
    add(main,'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheets><sheet name="QA" sheetId="1"/></sheets></workbook>');
    add('xl/sharedStrings.xml','<sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><si><t>Lectura Excel QA</t></si></sst>');
    add('xl/worksheets/sheet1.xml','<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="C1"><v>42</v></c></row></sheetData></worksheet>');
  }
  if(kind==="pptx") {add(main,'<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"/>');add('ppt/slides/slide1.xml','<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:p><a:r><a:t>Lectura PowerPoint QA</a:t></a:r></a:p></p:sld>');}
  return Buffer.from(CFB.write(container,{type:"buffer",fileType:"zip",compression:false}));
}
export function pdfFixture() {
  const content="BT /F1 12 Tf 40 740 Td (Lectura PDF privada QA) Tj ET";
  const objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",`<< /Length ${content.length} >>\nstream\n${content}\nendstream`,"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  let result="%PDF-1.7\n";const offsets=[0];
  objects.forEach((value,index)=>{offsets.push(Buffer.byteLength(result));result+=`${index+1} 0 obj\n${value}\nendobj\n`;});
  const xref=Buffer.byteLength(result);
  result+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(value=>String(value).padStart(10,"0")+" 00000 n \n").join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(result);
}
