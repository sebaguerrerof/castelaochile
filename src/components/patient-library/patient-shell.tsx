"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, CalendarDays, CheckSquare, ClipboardList, FileText, FolderClosed, Home, Star, UserRound } from "lucide-react";
import { BrandLogo } from "@/components/shared/brand-logo";
import { patientLogout } from "@/app/pacientes/actions";

const links=[{href:"/pacientes",label:"Inicio",Icon:Home},{href:"/pacientes/biblioteca",label:"Mi biblioteca",Icon:FolderClosed},{href:"/pacientes/favoritos",label:"Favoritos",Icon:Star},{href:"/pacientes/perfil",label:"Mi perfil",Icon:UserRound}];
export function PatientShell({name,children,careEnabled=false}:{name:string;children:React.ReactNode;careEnabled?:boolean}) {
  const path=usePathname();
  const navigation=careEnabled?[{href:"/pacientes/hoy",label:"Hoy",Icon:Home},{href:"/pacientes/planificacion",label:"Mi semana",Icon:CalendarDays},{href:"/pacientes/reportes",label:"Reportes",Icon:ClipboardList},{href:"/pacientes/compromisos",label:"Compromisos",Icon:CheckSquare},{href:"/pacientes/autonomia",label:"Autonomía y mis acuerdos",Icon:ClipboardList},{href:"/pacientes/resumenes",label:"Mis resúmenes",Icon:FileText},...links.slice(1)]:links;
  return <div className="patient-shell"><a className="library-skip" href="#patient-content">Saltar al contenido</a>
    <aside className="patient-sidebar"><Link href="/pacientes" prefetch={false} aria-label="Instituto Castelao Chile, inicio"><BrandLogo/></Link>
      <p className="library-eyebrow"><BookOpen size={17} aria-hidden="true"/> Espacio de pacientes</p>
      <nav aria-label="Navegación del portal">{navigation.map(({href,label,Icon})=><Link key={href} href={href} prefetch={false} aria-current={(href==="/pacientes" ? path===href : path.startsWith(href)) ? "page" : undefined}><Icon size={20} aria-hidden="true"/>{label}</Link>)}</nav>
      <p className="patient-sidebar-note">{careEnabled?"Planifica tu semana y revisa tus compromisos. Biblioteca siempre disponible.":"Materiales para acompañarte en tu proceso."}</p>
    </aside><div className="patient-main"><header className="patient-topbar"><span>Hola, <strong>{name}</strong></span><form action={patientLogout}><button className="library-text-button">Cerrar sesión</button></form></header>
      <main id="patient-content" className="patient-content" tabIndex={-1}>{children}</main><footer className="patient-footer">Instituto Castelao Chile · {careEnabled?"Espacio privado de pacientes":"Biblioteca privada"}</footer></div></div>;
}
