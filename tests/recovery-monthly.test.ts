import test from "node:test";
import assert from "node:assert/strict";
import { recoveryMonthlyTextSchema } from "../src/lib/care/recovery-monthly.ts";
import { recoveryDimensionKeys,recoveryDimensionLabels } from "../src/lib/care/recovery-weekly.ts";
import { recoveryCommunicationSchema } from "../src/lib/care/recovery-communication.ts";
test("Borrador mensual incompleto no incorpora hechos ni una dimensión desconocida",()=>{
 const input={advances:"",coverage:"",difficulties:"",support:"",next_goals:"",changes:Object.fromEntries(recoveryDimensionKeys.map(k=>[k,""]))};
 assert.deepEqual(recoveryMonthlyTextSchema.parse(input),input);
 assert.equal(recoveryMonthlyTextSchema.safeParse({...input,changes:{...input.changes,otra:"Texto"}}).success,false);
 const missing={...input.changes};delete missing.cumplimiento;
 assert.equal(recoveryMonthlyTextSchema.safeParse({...input,changes:missing}).success,false);
});
test("Las ocho etiquetas visibles del informe preservan las dimensiones documentales",()=>{
 assert.equal(Object.keys(recoveryDimensionLabels).length,8);
 assert.equal(recoveryDimensionLabels.planificacion_personal,"Planificación personal");
 assert.equal(recoveryDimensionLabels.habitos_constancia,"Hábitos y constancia");
 assert.equal(recoveryDimensionLabels.coherencia_conductual,"Coherencia conductual");
});
test("Comunicación exige confirmación expresa y destinatario UUID, sin canal por defecto",()=>{
 const id="b1000000-0000-4000-8000-000000000001",p={id,request_id:id,version:0,recipient_id:id,channel:"Canal neutral QA",occurred_at:"2026-10-10T12:00:00Z",reason:"Contacto realizado QA",confirm:true};
 assert.equal(recoveryCommunicationSchema.safeParse(p).success,true);
 for(const patch of [{confirm:false},{channel:""},{recipient_id:"correo libre"}])assert.equal(recoveryCommunicationSchema.safeParse({...p,...patch}).success,false);
});
