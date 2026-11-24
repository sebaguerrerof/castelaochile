import Link from "next/link";
import { materialKinds, searchFilters } from "@/lib/patient-library/policy";
import type { TherapyArea } from "@/types/patient-library";

export function LibrarySearchControls({values,areas,action}:{values:Record<string,string|string[]|undefined>;areas:TherapyArea[];action:string}) {
  const filters=searchFilters(values);
  return <form method="get" action={action} className="library-search" role="search" aria-label="Buscar materiales autorizados">
    <label className="library-search-query">Buscar materiales<input name="q" type="search" defaultValue={filters.q} maxLength={120} placeholder="Título, descripción o etiqueta"/></label>
    <label>Área<select name="area" defaultValue={filters.area ?? ""}><option value="">Todas mis áreas</option>{areas.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <label>Tipo<select name="tipo" defaultValue={filters.kind_filter ?? ""}><option value="">Todos los tipos</option>{Object.entries(materialKinds).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></label>
    <label>Sesión desde<input name="desde" type="date" defaultValue={filters.date_from}/></label><label>Sesión hasta<input name="hasta" type="date" defaultValue={filters.date_to}/></label>
    {values.vista==="lista" && <input name="vista" value="lista" type="hidden"/>}
    <button className="library-button">Buscar</button><Link href={action} prefetch={false} className="library-text-button">Limpiar filtros</Link>
  </form>;
}
export function libraryHref(action:string,values:Record<string,string|string[]|undefined>,changes:Record<string,string>) {
  const params=new URLSearchParams();for(const key of ["q","area","tipo","desde","hasta","vista","pagina","estado"]) if(typeof values[key]==="string" && values[key])params.set(key,values[key] as string);
  for(const [k,v] of Object.entries(changes))params.set(k,v);
  return `${action}?${params.toString()}`;
}
export function LibraryPagination({action,values,total,page}:{action:string;values:Record<string,string|string[]|undefined>;total:number;page:number}) {
  return <nav aria-label="Páginas de materiales" className="library-pagination">{page>1 && <Link prefetch={false} href={libraryHref(action,values,{pagina:String(page-1)})}>Anterior</Link>}<span>Página {page}{total>0 && ` de ${Math.ceil(total/24)}`}</span>{page*24<total && <Link prefetch={false} href={libraryHref(action,values,{pagina:String(page+1)})}>Siguiente</Link>}</nav>;
}
