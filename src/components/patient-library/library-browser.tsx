import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, FolderClosed, LayoutGrid, List } from "lucide-react";
import { requirePatientPage } from "@/lib/patient-library/server";
import { materialKinds, searchFilters, uuid } from "@/lib/patient-library/policy";
import type { PatientNavigation } from "@/types/patient-library";
import { FavoriteButton } from "./patient-forms";
import { LibraryPagination, LibrarySearchControls, libraryHref } from "./search-controls";

export async function LibraryBrowser({values,folderId,favorites=false,home=false}:{values:Record<string,string|string[]|undefined>;folderId?:string;favorites?:boolean;home?:boolean}) {
  const {client}=await requirePatientPage();
  if(folderId && !uuid.safeParse(folderId).success)notFound();
  const {data:navigation,error:navError}=await client.rpc("library_navigation",{});
  if(navError || !navigation)throw new Error("No fue posible cargar la biblioteca.");
  const {areas,folders}=navigation as unknown as PatientNavigation;
  const current=folders.find(f=>f.id===folderId);
  if(folderId && !current)notFound();
  const action=favorites ? "/pacientes/favoritos" : folderId ? `/pacientes/biblioteca/carpetas/${folderId}` : home ? "/pacientes" : "/pacientes/biblioteca";
  const filters=searchFilters(values);
  const {data:materials,error}=await client.rpc("library_search",{...filters,folder:folderId,favorites});
  if(error)throw new Error("No fue posible buscar materiales.");
  const crumbs=[];let cursor=current;while(cursor){crumbs.unshift(cursor);cursor=folders.find(f=>f.id===cursor?.parent_id);if(crumbs.length>4)break;}
  const list=values.vista==="lista";
  const childFolders=folders.filter(f=>f.parent_id===(folderId ?? null) && (!filters.area || f.area_id===filters.area));
  return <><p className="library-eyebrow">Instituto Castelao Chile</p><h1>{favorites ? "Mis favoritos" : home ? "Tu espacio de acompañamiento" : current?.name ?? "Mi biblioteca"}</h1>
    <p className="library-lead">{home ? "Encuentra los materiales que el equipo ha compartido contigo, a tu ritmo." : favorites ? "Los materiales que guardaste y que siguen disponibles para ti." : "Guías, actividades y recursos para acompañar tu proceso."}</p>
    <nav className="library-breadcrumbs" aria-label="Ruta de carpetas"><Link href="/pacientes/biblioteca" prefetch={false}>Biblioteca</Link>{crumbs.map(f=><Link key={f.id} href={`/pacientes/biblioteca/carpetas/${f.id}`} prefetch={false} aria-current={f.id===folderId ? "page" : undefined}>{f.name}</Link>)}</nav>
    <LibrarySearchControls action={action} areas={areas} values={values}/>
    {!favorites && childFolders.length>0 && <section aria-label="Carpetas"><h2>Carpetas</h2><div className="library-folder-grid">{childFolders.map(f=><Link className="library-folder" href={`/pacientes/biblioteca/carpetas/${f.id}`} key={f.id} prefetch={false}><FolderClosed size={26} aria-hidden="true"/><span><strong>{f.name}</strong><small>{areas.find(a=>a.id===f.area_id)?.name}</small></span></Link>)}</div></section>}
    <div className="library-results-header"><h2>{home ? "Materiales recientes" : "Materiales"} <span>({materials?.[0]?.total_count ?? 0})</span></h2><nav aria-label="Vista de materiales"><Link prefetch={false} aria-label="Cuadrícula" aria-current={!list ? "page" : undefined} href={libraryHref(action,values,{vista:"cuadricula"})}><LayoutGrid size={20}/></Link><Link prefetch={false} aria-label="Lista" aria-current={list ? "page" : undefined} href={libraryHref(action,values,{vista:"lista"})}><List size={20}/></Link></nav></div>
    {materials?.length ? <div className={list ? "library-grid library-grid--list" : "library-grid"}>{materials.map(m=><article className="library-material-card" key={m.id}>
      <div className="library-material-icon"><FileText aria-hidden="true" size={28}/></div><div className="library-material-summary"><div className="library-material-meta"><span>{materialKinds[m.kind]}</span>{m.is_new && <span className="library-new">Nuevo</span>}</div>
      <h3><Link href={`/pacientes/materiales/${m.id}`} prefetch={false}>{m.title}</Link></h3><p>{m.description}</p><small>{areas.find(a=>a.id===m.area_id)?.name}{m.session_date && ` · Sesión ${new Date(m.session_date+"T12:00:00Z").toLocaleDateString("es-CL",{timeZone:"UTC"})}`}</small></div>
      <FavoriteButton id={m.id} favorite={m.favorite}/></article>)}</div> : <section className="library-empty"><FolderClosed size={36} aria-hidden="true"/><h3>{favorites ? "Todavía no tienes favoritos disponibles" : "No hay materiales para mostrar"}</h3><p>Prueba otros filtros o vuelve más adelante cuando el equipo comparta nuevos recursos.</p></section>}
    <LibraryPagination action={action} values={values} page={filters.page} total={materials?.[0]?.total_count ?? 0}/><p className="library-footnote">«Nuevo» indica que todavía no has abierto el material. No es una medida de progreso.</p>
  </>;
}
