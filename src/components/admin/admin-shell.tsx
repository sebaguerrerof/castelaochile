"use client";

import {
  ChartNoAxesCombined,
  BookOpen,
  CalendarDays,
  Globe,
  HeartHandshake,
  Settings2,
  ChevronDown,
  FileText,
  Inbox,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { BrandLogo } from "@/components/shared/brand-logo";
import { NavigationSearch } from "./navigation-search";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { AdminRole } from "@/types/database";
import type { LibraryCapability, LibraryPermissions } from "@/types/patient-library";
import { hasLibraryCapability } from "@/lib/patient-library/policy";
import type { CareCapability } from "@/types/care";
import { isClinicalRole, staffRoleLabels } from "@/lib/staff-roles";

type NavigationItem = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  roles?: readonly AdminRole[];
  capability?: LibraryCapability;
  superadminAccess?: boolean;
  care?: boolean;
  section?: "centre" | "website";
  careCapability?: CareCapability;
};

const navigation: NavigationItem[] = [
  { href: "/admin", icon: LayoutDashboard, label: "Inicio" },
  { href: "/admin/demostracion", icon: BookOpen, label: "Demostración", roles: ["superadmin"] },
  { href: "/admin/pacientes", icon: Users, label: "Pacientes", capability: "access", superadminAccess: true },
  { href: "/admin/seguimiento", icon: ChartNoAxesCombined, label: "Seguimiento", care: true },
  { href: "/admin/seguimiento/agenda", icon: CalendarDays, label: "Agenda del centro", care: true, careCapability: "care.decisions.manage" },
  { href: "/admin/seguimiento/mi-trabajo", icon: CalendarDays, label: "Mi agenda y pendientes", care: true, careCapability: "care.records.read" },
  { href: "/admin/seguimiento/recovery", icon: HeartHandshake, label: "Recovery", care: true, careCapability: "care.records.read" },
  { href: "/admin/seguimiento/informes", icon: FileText, label: "Informes", care: true, careCapability: "care.reports.export" },
  { href: "/admin/usuarios", icon: Users, label: "Equipo y usuarios", roles: ["superadmin"] },
  { href: "/admin/grupos-terapeuticos", icon: Users, label: "Grupos terapéuticos", capability: "access" },
  { href: "/admin/biblioteca", icon: BookOpen, label: "Biblioteca", capability: "read" },
  { href: "/admin/analitica", icon: ChartNoAxesCombined, label: "Analítica", section: "website" },
  { href: "/admin/consultas", icon: Inbox, label: "Consultas", roles: ["editor", "superadmin"] },
  { href: "/admin/contenidos", icon: FileText, label: "Contenidos" },
  { href: "/admin/paginas", icon: Globe, label: "Páginas" },
  { href: "/admin/equipo", icon: Users, label: "Equipo del sitio" },
  { href: "/admin/configuracion", icon: Settings2, label: "Configuración", roles: ["editor", "superadmin"] },
];

const roleLabels = staffRoleLabels;
const websitePaths = ["/admin/analitica", "/admin/consultas", "/admin/contenidos", "/admin/paginas", "/admin/equipo", "/admin/configuracion"];
const navigationSection = (item: NavigationItem) => websitePaths.includes(item.href) ? "website" : "centre";

const segmentLabels: Record<string, string> = {
  admin: "Administración",
  analitica: "Analítica",
  consultas: "Consultas",
  contenidos: "Contenidos",
  paginas: "Páginas",
  equipo: "Equipo",
  configuracion: "Configuración",
  usuarios: "Usuarios",
  pacientes: "Pacientes",
  permisos: "Permisos del equipo",
  biblioteca: "Biblioteca terapéutica",
  "grupos-terapeuticos": "Grupos terapéuticos",
  seguimiento: "Seguimiento",
  informes: "Informes de seguimiento",
  programaciones: "Programaciones y reglas",
  comparacion: "Comparación de periodos",
  registros: "Registros profesionales",
  autonomia: "Autonomía Recovery",
  recovery: "Recovery",
  semanal: "Revisión semanal",
  familia: "Seguimiento familiar",
  rubricas: "Rúbricas Recovery",
  decisiones: "Decisiones de dirección",
  tareas: "Acciones delegadas",
  supervision: "Supervisión del equipo",
  "mi-trabajo": "Mi trabajo",
  intervenciones: "Solicitudes de intervención",
  planificacion: "Planificación",
  reportes: "Reportes diarios",
  agenda: "Agenda",
  alertas: "Alertas operativas",
  indicadores: "Indicadores",
  fuentes: "Fuentes del indicador",
  evidencia: "Fuentes del indicador",
  perfil: "Mi perfil",
  nuevo: "Nueva entrada",
  editar: "Editar",
  "vista-previa": "Vista previa",
};

function isActivePath(pathname: string, href: string) {
  return href === "/admin" || href === "/admin/seguimiento" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function getPageName(pathname: string) {
  if (pathname === "/admin/pacientes/nuevo") return "Nuevo paciente";
  if (pathname === "/admin/pacientes/permisos") return "Permisos del equipo";
  const match = navigation.filter((item) => isActivePath(pathname, item.href)).sort((a,b)=>b.href.length-a.href.length)[0];
  if (pathname.startsWith("/admin/perfil")) return "Mi perfil";
  return match?.label ?? "Administración";
}

function getInitials(email: string) {
  const value = email.split("@")[0]?.replace(/[^a-z0-9]+/gi, " ").trim();
  if (!value) return "IC";
  return value.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function AdminBreadcrumbs({ pathname }: { pathname: string }) {
  const segments = pathname.split("/").filter(Boolean);
  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const isId = /^[0-9a-f-]{36}$/i.test(segment);
    const newLabel=segments[index-1]==="decisiones"?"Nueva decisión":segments[index-1]==="autonomia"?"Nueva observación":segments[index-1]==="familia"?"Nueva sesión familiar":segments[index-1]==="registros"?"Nuevo registro":segments[index-1]==="agenda"?"Nueva actividad":segments[index-1]==="pacientes"?"Nuevo paciente":segmentLabels.nuevo;
    const virtualCareIndex=href==="/admin/seguimiento/agenda"||href==="/admin/seguimiento/reportes"||/^\/admin\/seguimiento\/pacientes\/[^/]+\/tareas$/.test(href);
    return { key:href, href:href==="/admin/seguimiento/pacientes"?"/admin/seguimiento":href, link:!virtualCareIndex, label: segment === "nuevo" ? newLabel : isId ? "Detalle" : (segmentLabels[segment] ?? segment), last: index === segments.length - 1 };
  });

  return (
    <nav aria-label="Ruta de navegación" className="admin-breadcrumbs">
      <ol>
        {crumbs.map((crumb) => (
          <li key={crumb.key}>
            {crumb.last ? <span aria-current="page">{crumb.label}</span> : crumb.link ? <Link href={crumb.href} prefetch={false}>{crumb.label}</Link> : <span>{crumb.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function AdminShell({ children, email, role, libraryPermissions=null, careCapabilities=[], careEnabled=false }: { children: React.ReactNode; email: string; role: AdminRole; libraryPermissions?: LibraryPermissions | null; careCapabilities?: CareCapability[]; careEnabled?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const availableNavigation = useMemo(
    () => navigation.filter((item) => (!item.roles || item.roles.includes(role)) && (role==="superadmin" || !isClinicalRole(role) || navigationSection(item)!=="website") && (!item.capability || hasLibraryCapability(libraryPermissions,item.capability) || (item.superadminAccess && role==="superadmin")) && (!item.care || careEnabled && (role==="superadmin" || careCapabilities.includes("care.directory.read") || careCapabilities.includes("care.assignments.manage"))) && (!item.careCapability || careCapabilities.includes(item.careCapability))),
    [role,libraryPermissions,careCapabilities,careEnabled],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setCollapsed(window.localStorage.getItem("castelao-admin-sidebar") === "collapsed"), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const media=window.matchMedia("(max-width: 1023px)");
    const update=()=>{setIsMobile(media.matches);if(!media.matches)setMobileOpen(false);};
    const timer=window.setTimeout(update,0);media.addEventListener("change",update);
    return()=>{window.clearTimeout(timer);media.removeEventListener("change",update);};
  },[]);

  useEffect(() => {
    if(!mobileOpen||!isMobile)return;
    const menu=sidebar.current;if(!menu)return;
    const trigger=mobileTrigger.current;
    const previousOverflow=document.body.style.overflow;document.body.style.overflow="hidden";
    menu.querySelector<HTMLButtonElement>(".admin-sidebar-mobile-close")?.focus();
    const trap=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){event.preventDefault();setMobileOpen(false);return;}
      if(event.key!=="Tab")return;
      const items=[...menu.querySelectorAll<HTMLElement>('a[href],button:not(:disabled)')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=="hidden");
      if(!items.length)return;
      // Safari may skip links on Tab; move explicitly through all visible menu controls.
      const current=items.indexOf(document.activeElement as HTMLElement);
      const next=current<0?(event.shiftKey?items.length-1:0):(current+(event.shiftKey?-1:1)+items.length)%items.length;
      event.preventDefault();items[next]?.focus({preventScroll:true});items[next]?.scrollIntoView({block:"nearest",inline:"nearest",behavior:"instant"});
    };
    menu.addEventListener("keydown",trap);
    return()=>{menu.removeEventListener("keydown",trap);document.body.style.overflow=previousOverflow;trigger?.focus();};
  },[mobileOpen,isMobile]);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      window.localStorage.setItem("castelao-admin-sidebar", next ? "collapsed" : "expanded");
      return next;
    });
  }

  async function signOut() {
    setIsSigningOut(true);
    try {
      await createBrowserSupabaseClient().auth.signOut();
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  const pageName = getPageName(pathname);
  const accountLabel=roleLabels[role];
  const topLinks=availableNavigation.filter(item=>["/admin/pacientes","/admin/biblioteca","/admin/seguimiento/mi-trabajo"].includes(item.href));

  return (
    <div className="admin-shell" data-collapsed={collapsed ? "true" : "false"}>
      <a className="admin-skip" href="#admin-content">Saltar al contenido</a>
      <header className="admin-topbar" inert={isMobile&&mobileOpen}>
        <div className="admin-topbar-start">
          <button ref={mobileTrigger} aria-label="Abrir navegación" aria-controls="admin-navigation" aria-expanded={mobileOpen} className="admin-icon-button admin-mobile-trigger" onClick={() => setMobileOpen(true)} type="button"><Menu aria-hidden="true" size={21}/></button>
          <button aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"} className="admin-icon-button admin-desktop-trigger" onClick={toggleCollapsed} type="button">{collapsed ? <PanelLeftOpen aria-hidden="true" size={21}/> : <PanelLeftClose aria-hidden="true" size={21}/>}</button>
          <Link aria-label="Ir al resumen administrativo" className="admin-topbar-brand" href="/admin" prefetch={false}><BrandLogo/></Link>
        </div>
        <NavigationSearch items={availableNavigation}/>
        <div className="admin-topbar-end">
          <nav className="admin-topbar-shortcuts" aria-label="Accesos rápidos">{topLinks.map(({href,label,icon:Icon})=><Link href={href} key={href} prefetch={false} aria-label={`Abrir ${label}`} title={label} aria-current={isActivePath(pathname,href)?"page":undefined}><Icon size={20} aria-hidden="true"/></Link>)}</nav>
          <details className="admin-user-menu" onKeyDown={event=>{if(event.key==="Escape"){event.preventDefault();event.currentTarget.open=false;event.currentTarget.querySelector<HTMLElement>("summary")?.focus();}}}>
            <summary aria-label="Menú de cuenta"><span className="admin-avatar" aria-hidden="true">{getInitials(email)}</span><span className="admin-user-menu-copy"><strong>{accountLabel}</strong><small>{email}</small></span><ChevronDown aria-hidden="true" size={16}/></summary>
            <div className="admin-user-menu-panel"><div className="admin-user-menu-identity"><strong>{email}</strong><span>{accountLabel}</span></div><Link href="/admin/perfil" prefetch={false}><UserRound aria-hidden="true" size={17}/> Mi perfil</Link><Link href="/admin/perfil#seguridad" prefetch={false}><LockKeyhole aria-hidden="true" size={17}/> Cambiar contraseña</Link><button disabled={isSigningOut} onClick={signOut} type="button"><LogOut aria-hidden="true" size={17}/>{isSigningOut ? "Cerrando…" : "Cerrar sesión"}</button></div>
          </details>
        </div>
      </header>
      <button
        aria-label="Cerrar navegación"
        className="admin-sidebar-overlay"
        data-open={mobileOpen ? "true" : "false"}
        onClick={() => setMobileOpen(false)}
        type="button"
        tabIndex={-1}
      />
      <aside ref={sidebar} id="admin-navigation" aria-label="Navegación administrativa" className="admin-sidebar" data-mobile-open={mobileOpen ? "true" : "false"} inert={isMobile&&!mobileOpen} role={isMobile&&mobileOpen?"dialog":undefined} aria-modal={isMobile&&mobileOpen?true:undefined}>
        <div className="admin-sidebar-header">
          <div className="admin-sidebar-space"><span className="admin-space-icon" aria-hidden="true"><HeartHandshake size={23}/></span><div><strong>Mi centro</strong><span>Espacio de trabajo</span></div></div>
          <button aria-label="Cerrar navegación" className="admin-icon-button admin-sidebar-mobile-close" onClick={() => setMobileOpen(false)} type="button">
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <nav className="admin-navigation" aria-label="Secciones">
          {(["centre","website"] as const).filter(section=>availableNavigation.some(item=>navigationSection(item)===section)).map(section=><div key={section} className="admin-navigation-group">
          <p className="admin-navigation-label">{section==="centre"?"Centro y pacientes":"Sitio web"}</p>
          {availableNavigation.filter(item=>navigationSection(item)===section).map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className="admin-navigation-link"
                data-tooltip={item.label}
                title={item.label}
                href={item.href}
                prefetch={false}
                key={item.href}
                onClick={() => setMobileOpen(false)}
              >
                <Icon aria-hidden="true" size={19} strokeWidth={1.9} />
                <span>{item.label}</span>
              </Link>
            );
          })}</div>)}
        </nav>

        <div className="admin-sidebar-footer">
          <Link aria-label="Mi perfil" aria-current={pathname.startsWith("/admin/perfil") ? "page" : undefined} className="admin-navigation-link" data-tooltip="Mi perfil" href="/admin/perfil" prefetch={false} onClick={() => setMobileOpen(false)}>
            <UserRound aria-hidden="true" size={19} />
            <span>Mi perfil</span>
          </Link>
          <div className="admin-sidebar-account">
            <span className="admin-avatar" aria-hidden="true">{getInitials(email)}</span>
            <span className="admin-sidebar-account-copy"><strong>{email}</strong><small>{accountLabel}</small></span>
          </div>
        </div>
      </aside>

      <div className="admin-workspace" inert={isMobile&&mobileOpen}>
        <main className="admin-main" id="admin-content" tabIndex={-1}><div className="admin-content"><div className="admin-location"><AdminBreadcrumbs pathname={pathname}/><span>{pageName}</span></div>{children}</div></main>
      </div>
    </div>
  );
}
