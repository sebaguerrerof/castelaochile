import Link from "next/link";
import type { CareCapability } from "@/types/care";
export function CareNav({caps,technical=false,active,compact=false}:{caps:CareCapability[];technical?:boolean;compact?:boolean;active:"agenda"|"recovery"|"patients"|"team"|"reports"|"requests"|"alerts"|"evidence"|"sources"|"metrics"|"rubrics"|"decisions"|"work"|"supervision"|"informs"|"jobs"}) {
  const has=(...needed:CareCapability[])=>needed.every(cap=>caps.includes(cap));
  const read=has("care.directory.read","care.patient.read","care.records.read");
  const govern=has("care.decisions.manage","care.patient.read","care.records.read");
  const exporting=read&&has("care.reports.export");
  const items=[
    {key:"agenda",href:"/admin/seguimiento/agenda",label:"Agenda del centro",show:govern},
    {key:"patients",href:"/admin/seguimiento",label:technical||has("care.assignments.manage")?"Todos los pacientes":"Mis pacientes",show:has("care.directory.read")},
    {key:"team",href:"/admin/seguimiento/equipo",label:"Equipo y asignaciones",show:!compact&&(technical||has("care.assignments.manage"))},
    {key:"reports",href:"/admin/seguimiento/reportes/configuracion",label:"Configurar reportes",show:!compact&&has("care.assignments.manage")},
    {key:"requests",href:"/admin/seguimiento/intervenciones",label:"Solicitudes de dirección",show:!compact&&has("care.decisions.manage")},
    {key:"metrics",href:"/admin/seguimiento/indicadores",label:"Indicadores",show:!compact&&read},
    {key:"alerts",href:"/admin/seguimiento/alertas",label:"Alertas operativas",show:!compact&&read},
    {key:"evidence",href:"/admin/seguimiento/evidencia?metrica=records",label:"Pendientes profesionales",show:!compact&&read},
    {key:"recovery",href:"/admin/seguimiento/recovery",label:"Recovery",show:read},
    {key:"rubrics",href:"/admin/seguimiento/rubricas",label:"Rúbricas Recovery",show:!compact&&has("care.decisions.manage","care.records.read")},
    {key:"work",href:"/admin/seguimiento/mi-trabajo",label:"Mi agenda y pendientes",show:active!=="informs"&&active!=="jobs"&&has("care.patient.read")&&(has("care.records.create")||has("care.records.read"))},
    {key:"decisions",href:"/admin/seguimiento/decisiones",label:"Decisiones de dirección",show:active!=="informs"&&active!=="jobs"&&govern},
    {key:"supervision",href:"/admin/seguimiento/supervision",label:"Supervisión del equipo",show:active!=="informs"&&active!=="jobs"&&govern},
    {key:"informs",href:"/admin/seguimiento/informes",label:"Informes de seguimiento",show:exporting&&(!compact||["informs","jobs","work","recovery"].includes(active))},
    {key:"jobs",href:"/admin/seguimiento/programaciones",label:"Programaciones y reglas",show:exporting&&has("care.decisions.manage")&&(!compact||active==="informs"||active==="jobs")},
  ].filter(item=>item.show);
  const main=items.filter(item=>["patients","recovery","work","informs",active].includes(item.key));
  const more=items.filter(item=>!main.includes(item));
  const link=(item:typeof items[number])=><Link key={item.key} href={item.href} prefetch={false} aria-current={active===item.key?"page":undefined}>{item.label}</Link>;
  return <nav className="care-nav" aria-label="Seguimiento terapéutico">
    {main.map(link)}
    {more.length>0&&<details className="care-nav-more"><summary>Más opciones del centro</summary><div>{more.map(link)}</div></details>}
    {active==="sources"&&<span aria-current="page" className="care-nav-current">Fuentes del indicador</span>}
  </nav>;
}
