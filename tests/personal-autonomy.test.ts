import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { personalAutonomyCatalog as catalog, personalOutcomeCriteria } from "../src/lib/care/personal-autonomy-catalog.ts";
import { personalAgreementSignature, personalCatalogSchema, personalOutcomes, personalProposalSchema, personalReviewSchema, personalResponseLabel, personalSectionProgress, validatePersonalPayload, type PersonalPayload } from "../src/lib/care/personal-autonomy.ts";
import { commitmentStatus } from "../src/lib/care/planning.ts";
const id = "da100000-0000-4000-8000-000000000003";
const payload = (): PersonalPayload => ({evaluation_date:"2026-10-17",coach_id:id,meeting_day:"Martes",review_frequency:"Quincenal",next_review:null,additional_notes:"",answers:Object.fromEntries(catalog.areas.flatMap(a=>a.items.map(i=>[i.id,{value:a.key<="F"?0:"A veces",context:"Ejemplo de la situación actual",missing_reason:""}]))),open_answers:Object.fromEntries(catalog.questions.filter(q=>q.section!=="learning").map(q=>[q.id,"Respuesta personal"]))});
test("Autonomía personal conserva integridad de las cinco fuentes y 41 ítems separados",()=>{
  personalCatalogSchema.parse(catalog);assert.equal(catalog.areas.flatMap(a=>a.items).length,41);assert.equal(catalog.questions.length,16);assert.equal(catalog.questions.filter(q=>q.section==="learning").length,5);
  for(const source of catalog.source_manifest) assert.equal(createHash("sha256").update(readFileSync(new URL(`../imgRecovery/img${source.page}.jpeg`,import.meta.url))).digest("hex"),source.sha256);
  assert.equal(personalOutcomes.length,personalOutcomeCriteria.length);
});
test("Cero cuenta como respuesta y no equivale a vacío ni información insuficiente",()=>{
  const p=payload();validatePersonalPayload(p,catalog,true);assert.equal(personalSectionProgress(p,catalog).answered,8);assert.equal(personalResponseLabel(0),"0 · Dependencia alta");
  p.answers.A1={value:null,context:"",missing_reason:"Sin información disponible"};validatePersonalPayload(p,catalog,true);assert.equal(personalSectionProgress(p,catalog).answered,7);assert.equal(personalResponseLabel(p.answers.A1.value),"Sin información");
  p.answers.A1.missing_reason="";assert.throws(()=>validatePersonalPayload(p,catalog,true));
});
test("G–H conserva Sí/No/A veces sin codificación ordinal; A–F rechaza texto y decimales",()=>{
  const p=payload();for(const value of ["Sí","No","A veces"] as const){p.answers.G1.value=value;validatePersonalPayload(p,catalog,true);assert.equal(personalResponseLabel(value),value);}
  p.answers.G1.value=0;assert.throws(()=>validatePersonalPayload(p,catalog));p.answers.G1.value="Sí";p.answers.A1.value="Sí";assert.throws(()=>validatePersonalPayload(p,catalog));p.answers.A1.value=1.5;assert.throws(()=>validatePersonalPayload(p,catalog));
});
test("Borrador incompleto y versión sin transcripción nunca se presentan como evaluación final",()=>{
  const p=payload();p.answers={};p.open_answers={};p.coach_id=null;assert.doesNotThrow(()=>validatePersonalPayload(p,catalog,false));assert.throws(()=>validatePersonalPayload(p,catalog,true));assert.throws(()=>validatePersonalPayload(payload(),{...catalog,transcription_state:"pending_source"},true));
});
test("Ítems y preguntas de otras versiones no contaminan el instrumento",()=>{
  const p=payload();p.answers.foreign={value:0,context:"",missing_reason:""};assert.throws(()=>validatePersonalPayload(p,catalog));delete p.answers.foreign;p.open_answers.learning1="No corresponde a evaluación inicial";assert.throws(()=>validatePersonalPayload(p,catalog));
});
test("Una propuesta mantiene responsable, origen separado, fechas y prevención de duplicados",()=>{
  const p={id,assessment_id:id,assessment_revision:1,area:"A",item_id:"A1",description:"Tarea acordable",responsible_kind:"patient",responsible_id:null,due_at:"2026-10-20T12:00:00Z",frequency:"Semanal",review_at:"2026-10-21T12:00:00Z",verification:"Conversar sobre ejemplo concreto",difficulty:"Dificultad",contingency:"Pedir apoyo",existing_commitment_id:id};
  assert.equal(personalProposalSchema.parse(p).existing_commitment_id,id);assert.throws(()=>personalProposalSchema.parse({...p,responsible_kind:"professional"}));assert.throws(()=>personalProposalSchema.parse({...p,origin:"patient"}));
});
test("Los cinco resultados de revisión son exactos e independientes del estado de tarea",()=>{
  const p={id,proposal_id:id,supersedes:null,review_date:"2026-10-17",period_start:"2026-10-01",period_end:"2026-10-17",result:"Resultado observado",evidence:"Ejemplo concreto",support:"Apoyo necesario",next_step:"Próximo ajuste",learning:{learning1:"Avance pequeño"},shared:true,reason:"Revisión acordada"};
  for(const outcome of personalOutcomes)assert.equal(personalReviewSchema.parse({...p,outcome}).outcome,outcome);
  assert.throws(()=>personalReviewSchema.parse({...p,outcome:"failed"}));assert.throws(()=>personalReviewSchema.parse({...p,outcome:"No evaluable",period_start:"2026-11-01"}));
});
test("Un acuerdo sin plazo conserva null y no se vuelve vencido por una fecha artificial",()=>{
  const p={id,assessment_id:id,assessment_revision:1,area:"A",item_id:"",description:"Tarea acordable",responsible_kind:"patient",responsible_id:null,due_at:null,frequency:"Quincenal",review_at:"2026-10-21T12:00:00Z",verification:"Conversar un ejemplo concreto",difficulty:"",contingency:"",existing_commitment_id:null};
  assert.equal(personalProposalSchema.parse(p).due_at,null);assert.equal(commitmentStatus({status:"pending",due_at:null,confirmation:null}),"Pendiente");
});
test("La constancia no queda pendiente por el orden de claves de JSONB; cambios reales sí se detectan",()=>{
  const a={id,commitment_id:null,patient_accepted_by:id,coach_accepted_by:null};
  const stored={coach_accepted_by:null,patient_accepted_by:id,commitment_id:null,id};
  assert.equal(personalAgreementSignature([a]),personalAgreementSignature([stored]));
  assert.notEqual(personalAgreementSignature([a]),personalAgreementSignature([{...stored,coach_accepted_by:id}]));
});
