import { recoverySourceKinds } from "@/lib/care/recovery-supervision";
import type { RecoverySupervisionQuery } from "@/lib/care/recovery-coach-server";
import { recoverySupportLabels,recoveryOutcomeLabels } from "@/lib/care/recovery-coach";
export function RecoverySupervisionFilters({query,period,kind,category,groups,patients=[],pid}:{query:RecoverySupervisionQuery;period:string;kind:string;category:string;groups:{id:string;name:string}[];patients?:{id:string;display_name:string}[];pid?:string}){
 const categories=kind==="activity"?recoverySupportLabels:kind==="commitment"?{...recoveryOutcomeLabels,cancelled:"Cancelado administrativamente",overdue:"Plazo vencido",review_due:"Revisión prevista pendiente"}:{final:"Finalizado",draft:"Borrador propio",pending:"Pendiente"};
 return <form className="care-search care-recovery-filters" method="get">
 <label>Periodo Recovery<select name="periodo" defaultValue={period}><option value="7">7 días</option><option value="30">30 días</option><option value="90">90 días</option></select></label>
 {!pid&&<><label>Buscar paciente<input name="q" defaultValue={query.q??""} maxLength={80}/></label><label>Paciente<select name="paciente" defaultValue={query.paciente??""}><option value="">Todos mis pacientes</option>{patients.map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label><label>Grupo actual<select name="grupo" defaultValue={query.grupo??""}><option value="">Todos mis grupos</option>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label></>}
 <label>Fuente Recovery<select name="tipo" defaultValue={kind}>{Object.entries(recoverySourceKinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 <label>Categoría o pendiente<select name="categoria" defaultValue={category}><option value="">Todas las categorías</option>{Object.entries(categories).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 <button className="admin-button admin-button-secondary">Aplicar filtros Recovery</button>
 </form>;
}
