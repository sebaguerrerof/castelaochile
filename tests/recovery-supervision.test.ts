import test from "node:test";
import assert from "node:assert/strict";
import { weeklyTimeline,weeklyDimensionLabel,type WeeklySeriesRow } from "../src/lib/care/recovery-supervision.ts";
import { emptyWeeklyPayload,type RecoveryRubric } from "../src/lib/care/recovery-weekly.ts";
const rid="c0000000-0000-4000-8000-000000000001";
function row(week:string,status="evaluated",level:string|null="3",mode="approved",rubricId=rid):WeeklySeriesRow{
 const payload=emptyWeeklyPayload();payload.dimensions.forEach(d=>Object.assign(d,{status,level}));
 return {id:"c4000000-0000-4000-8000-000000000001",patient_id:"b2000000-0000-4000-8000-000000000001",rubric_id:rubricId,week_start:week,author_id:"b1000000-0000-4000-8000-000000000004",status:"final",version:1,revision:1,evaluated_at:"2026-10-10T12:00:00Z",occurred_at:week+"T12:00:00Z",mode:mode as WeeklySeriesRow["mode"],payload};
}
test("Trayectoria preserva huecos y SE por dimensión, sin interpolar ni convertirlos a cero",()=>{
 const rows=[row("2026-09-07"),row("2026-09-21","SE",null),row("2026-09-28","evaluated","4")];
 const series=weeklyTimeline("2026-09-07","2026-10-04",rows,rid,"approved");
 assert.equal(series.length,8);assert.deepEqual(series[0].points.map(p=>p.level),[3,null,null,4]);
 assert.equal(series[0].points[1].row,undefined);assert.equal(series[0].points[2].dimension?.status,"SE");
});
test("Versiones, modo piloto y borradores no completan huecos de una serie aprobada",()=>{
 const a=row("2026-09-07"),b=row("2026-09-14","evaluated","4","pilot"),c=row("2026-09-21","evaluated","4","approved","c0000000-0000-4000-8000-000000000002"),d=row("2026-09-28");d.status="draft";
 assert.deepEqual(weeklyTimeline("2026-09-07","2026-10-04",[a,b,c,d],rid,"approved")[0].points.map(p=>p.level),[3,null,null,null]);
});
test("Matriz usa etiquetas de la versión real y distingue ausencia, SE y cualitativa",()=>{
 const r={dimensions:[{key:"cumplimiento",levels:[{key:"3",label:"Etiqueta modificada de otra versión"}]}]} as RecoveryRubric;
 assert.equal(weeklyDimensionLabel(r,"cumplimiento","evaluated","3"),"Etiqueta modificada de otra versión");
 assert.equal(weeklyDimensionLabel(r,"cumplimiento",undefined,null),"Sin revisión registrada");
 assert.equal(weeklyDimensionLabel(r,"cumplimiento","SE",null),"SE — Sin evaluar");
 assert.equal(weeklyDimensionLabel(r,"cumplimiento","qualitative",null),"Cualitativa sin nivel");
});
