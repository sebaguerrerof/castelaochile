export const careTimezone="America/Santiago";
const localParts=(date:Date)=>new Intl.DateTimeFormat("sv-SE",{timeZone:careTimezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(date).replace(" ","T");
export const careLocalInput=(iso:string|Date|null=new Date())=>iso===null?"":localParts(new Date(iso));
export const careTimestamp=(iso:string|null)=>iso===null?"Sin fecha acordada":new Intl.DateTimeFormat("es-CL",{timeZone:careTimezone,dateStyle:"medium",timeStyle:"short"}).format(new Date(iso));
/** Resolve actual IANA offsets; reject nonexistent and ambiguous civil times instead of silently moving them. */
export function careLocalToUtc(value:unknown):string {
  if(typeof value!=="string"||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Ingresa fecha y hora de Chile.");
  const nominal=Date.parse(value+":00Z");
  const candidates=[3,4].map(offset=>new Date(nominal+offset*3600000)).filter(date=>Number.isFinite(date.getTime())&&localParts(date)===value);
  if(candidates.length!==1) throw new Error("Esta hora no existe o se repite por el cambio de horario. Elige otra hora.");
  return candidates[0].toISOString();
}
export function careWeekRange(value?:string,now=new Date()) {
  const parsed=new Date(value+"T00:00:00Z");
  const valid=value&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,10)===value;
  const day=new Date((valid?value:careLocalInput(now).slice(0,10))+"T00:00:00Z");
  const weekday=(day.getUTCDay()+6)%7;day.setUTCDate(day.getUTCDate()-weekday);
  const monday=day.toISOString().slice(0,10);const next=new Date(day);next.setUTCDate(next.getUTCDate()+7);
  const previous=new Date(day);previous.setUTCDate(previous.getUTCDate()-7);
  const until=new Date(day);until.setUTCDate(until.getUTCDate()+6);
  return {monday,start:careLocalToUtc(monday+"T00:00"),end:careLocalToUtc(next.toISOString().slice(0,10)+"T00:00"),
    next:next.toISOString().slice(0,10),previous:previous.toISOString().slice(0,10),label:`${monday} al ${until.toISOString().slice(0,10)} · Chile`};
}
