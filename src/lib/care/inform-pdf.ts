import { recoveryDimensionLabels,type RecoveryDimension } from "./recovery-weekly";
import { recoveryMonthlyFields } from "./recovery-monthly";
import PDFDocument from "pdfkit";
import path from "node:path";
import { informKinds,informPeriodLabel,informSourceTitle,informStateLabel,type InformRead } from "./informs";
import { careTimestamp } from "./time";
import { metricDefinitions } from "./metrics";
const ink="#123e55",blue="#0086b6",muted="#516578";
// Standard PDF fonts cover Spanish. Preserve unsupported characters explicitly.
const printable=(s:string)=>s.replace(/[\u2010-\u2015]/g,"-").replace(/\u00a0/g," ").replace(/[^\u0009\u000a\u000d\u0020-\u007e\u00a1-\u00ff\u20ac\u2018\u2019\u201c\u201d]/gu,c=>`[U+${c.codePointAt(0)!.toString(16).toUpperCase()}]`);
export async function renderInformPdf(data:InformRead):Promise<Buffer>{
 const doc=new PDFDocument({size:"A4",margins:{top:115,bottom:60,left:48,right:48},bufferPages:true,info:{Title:`${informKinds[data.inform.kind]} ${data.inform.start_day}`,Author:"Instituto Castelao Chile",Subject:informStateLabel(data),CreationDate:new Date(data.version.generated_at)}});
 const chunks:Buffer[]=[];let bytes=0;
 const output=new Promise<Buffer>((resolve,reject)=>{doc.on("data",(chunk:Buffer)=>{bytes+=chunk.length;if(bytes>5242880){doc.destroy(new Error("El PDF supera 5 MB; acota el alcance."));return;}chunks.push(chunk);});doc.on("end",()=>resolve(Buffer.concat(chunks)));doc.on("error",reject);});
 const width=doc.page.width-96,bottom=()=>doc.page.height-60;
 function header(){doc.image(path.join(process.cwd(),"public/brand/instituto-castelao-horizontal-manual-preview.png"),48,24,{fit:[180,42]});doc.font("Helvetica").fontSize(9).fillColor(muted).text("SEGUIMIENTO TERAPÉUTICO",300,29,{width:247,align:"right"});doc.text(`Versión ${data.version.revision} - ${data.version.state==="reviewed"?"Revisado":"Pendiente de revisión"}`,300,45,{width:247,align:"right"});doc.moveTo(48,91).lineTo(547,91).lineWidth(1).strokeColor(blue).stroke();doc.x=48;doc.y=115;}
 // Draw headers after layout: text flowing onto a new page must not share
 // PDFKit's active text wrapper with the header.
 function room(h:number){if(doc.y+h>bottom())doc.addPage();}
 function paragraph(text:string,size=10,bold=false){doc.font(bold?"Helvetica-Bold":"Helvetica").fontSize(size).fillColor(ink);doc.text(printable(text),48,doc.y,{width,lineGap:3});doc.moveDown(.5);}
 function heading(text:string){room(55);doc.moveDown(.4);paragraph(text,14,true);}
 function row(left:string,right:string){doc.font("Helvetica").fontSize(10);const h=Math.max(doc.heightOfString(printable(left),{width:width*.7}),doc.heightOfString(printable(right),{width:width*.25}))+13;room(h);const y=doc.y;doc.fillColor(ink).text(printable(left),48,y,{width:width*.7});doc.text(printable(right),48+width*.73,y,{width:width*.27,align:"right"});doc.moveTo(48,y+h-4).lineTo(547,y+h-4).strokeColor("#dce6ec").lineWidth(.5).stroke();doc.x=48;doc.y=y+h;}
 paragraph(informKinds[data.inform.kind],21,true);paragraph(informPeriodLabel(data),10);
 paragraph(informStateLabel(data),11,true);paragraph(`Consolidación: ${careTimestamp(data.snapshot.data_cutoff)}. Población: ${data.snapshot.population} ${data.snapshot.population===1?"paciente autorizado":"pacientes autorizados"}.`,10);
 paragraph("Resumen determinista de registros existentes. Las categorías clínicas conservan su autor; no representan una puntuación ni una conclusión nueva. Las correcciones conocidas al consolidar pueden ser posteriores al periodo.",10);
 if(data.version.reviewed_at){paragraph(`Revisión: ${careTimestamp(data.version.reviewed_at)}`,10,true);paragraph(data.version.review_note);}
 if(data.version.recovery_text){heading("Resumen mensual Recovery editado por profesional");paragraph(data.version.recovery_delivered_at?`Entregado ${careTimestamp(data.version.recovery_delivered_at)} · ${data.version.recovery_reviewed_at?"Revisado por Dirección":"Pendiente de revisión de Dirección"}`:"Texto profesional no entregado; no acredita entrega ni revisión",10,true);for(const [key,label] of Object.entries(recoveryMonthlyFields)){room(70);paragraph(label,11,true);paragraph(data.version.recovery_text[key as keyof typeof recoveryMonthlyFields]||"Sin texto registrado");}for(const [key,text] of Object.entries(data.version.recovery_text.changes)){room(70);paragraph(recoveryDimensionLabels[key as RecoveryDimension],11,true);paragraph(text||"Sin texto por dimensión");}if(data.version.recovery_review_note)paragraph(data.version.recovery_review_note);}
 heading("Cumplimiento y fuentes del periodo");
 for(const metric of ["attendance","reports","records"] as const){const def=metricDefinitions[metric],buckets=data.snapshot.counts.filter(x=>x.metric===metric),total=buckets.reduce((n,x)=>n+x.n,0),n=buckets.filter(x=>def.success.some(s=>s===x.category)).reduce((n,x)=>n+x.n,0);room(95+buckets.length*28);paragraph(def.title,12,true);paragraph(def.summary,9);row("Elegibles / resultado",total?`${n}/${total}`:"No aplica: N=0");for(const b of buckets){const label=(def.categories as Record<string,string>)[b.category??""]??b.category??"Sin categoría";const y=doc.y;paragraph(`${label}: ${b.n}/${total}`,9);doc.rect(48,y+14,width,5).fill("#e8eef2");if(total&&b.n)doc.rect(48,y+14,width*b.n/total,5).fill(blue);doc.y=Math.max(doc.y,y+28);}doc.moveDown(.6);}
 heading("Datos faltantes y límites");const q=data.snapshot.quality;
 row("Pacientes sin obligaciones registradas en el periodo",String(q.without_obligations));row("Asistencias realizadas sin registro de asistencia",String(q.unrecorded_attendance));row("Registros de sesión pendientes de finalizar",String(q.pending_records));
 paragraph(`Las obligaciones ausentes no se cuentan como reportes omitidos. Sin plazo universal configurado para finalizar registros, no se infiere atraso. ${data.snapshot.quality.scheduler_verified?"Consolidado por una ejecución privada de cron verificada.":"Este snapshot no acredita una ejecución programada; consulta Programaciones para el estado actual."} Familia y dirección se incluyen solo según permisos al generar y al abrir.`,9);
 heading("Población del informe");for(const p of data.snapshot.patients)row(p.display_name,"Paciente autorizado");
 heading("Pacientes con revisión pendiente documentada");
 paragraph("Pendientes operativos y valoraciones profesionales existentes; no es un diagnóstico nuevo.",9);
 for(const p of data.snapshot.needs_review){paragraph(p.display_name,11,true);paragraph(p.reasons.join(". "),9);}
 if(!data.snapshot.needs_review.length)paragraph("Sin pendientes registrados en estas fuentes. La ausencia de datos no demuestra estabilidad.",9);
 heading("Fuentes, avances, dificultades y pendientes registrados");
 paragraph(`Total: ${data.snapshot.source_total} fuentes. Los pendientes anteriores al periodo se señalan por separado y no incrementan las barras del periodo. Los textos siguientes se transcriben de campos autorizados; no incluyen notas reservadas ni participantes familiares.`,9);
 if(!data.snapshot.sources.length)paragraph("Sin fuentes registradas para este periodo. Esto no demuestra estabilidad clínica.");
 for(const s of data.snapshot.sources){room(105);paragraph(`${s.display_name} - ${informSourceTitle(s)}`,11,true);paragraph(`${careTimestamp(s.occurred_at)} - ${s.author_label}${s.revision?` - revisión ${s.revision}`:""}${s.carried?" - Pendiente/valoración anterior al periodo":""}`,9);if(s.body&&s.metric!=="reports")paragraph(s.body,10);paragraph(`Fuente: ${s.source_id}${s.revision?` / revisión ${s.revision}`:""}`,8);doc.moveDown(.4);}
 const range=doc.bufferedPageRange();if(range.count>100){doc.destroy(new Error("El informe supera 100 páginas; acota a un paciente."));return output;}
 for(let index=range.start;index<range.start+range.count;index++){
  doc.switchToPage(index);
  // Footer lies outside the body margin: prevent PDFKit from adding a page.
  const margin=doc.page.margins.bottom;doc.page.margins.bottom=0;
  header();
  doc.font("Helvetica").fontSize(8).fillColor(muted).text(`Instituto Castelao Chile - Uso interno autorizado - Página ${index+1} de ${range.count}`,48,doc.page.height-34,{width,align:"center",lineBreak:false});
  doc.page.margins.bottom=margin;
 }
 doc.end();return output;
}
