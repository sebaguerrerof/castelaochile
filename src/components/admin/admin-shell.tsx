"use client";

import {
  ChartNoAxesCombined,
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
import { useEffect, useMemo, useState } from "react";

import { BrandLogo } from "@/components/shared/brand-logo";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { AdminRole } from "@/types/database";

type NavigationItem = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  roles?: readonly AdminRole[];
};

const navigation: NavigationItem[] = [
  { href: "/admin", icon: LayoutDashboard, label: "Resumen" },
  { href: "/admin/analitica", icon: ChartNoAxesCombined, label: "Analítica" },
  { href: "/admin/consultas", icon: Inbox, label: "Consultas", roles: ["editor", "superadmin"] },
  { href: "/admin/contenidos", icon: FileText, label: "Contenidos" },
  { href: "/admin/usuarios", icon: Users, label: "Usuarios", roles: ["superadmin"] },
];

const roleLabels: Record<AdminRole, string> = {
  editor: "Editor",
  superadmin: "Superadministrador",
  viewer: "Solo lectura",
};

const segmentLabels: Record<string, string> = {
  admin: "Administración",
  analitica: "Analítica",
  consultas: "Consultas",
  contenidos: "Contenidos",
  usuarios: "Usuarios",
  perfil: "Mi perfil",
  nuevo: "Nueva entrada",
  editar: "Editar",
  "vista-previa": "Vista previa",
};

function isActivePath(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function getPageName(pathname: string) {
  const match = navigation.find((item) => isActivePath(pathname, item.href));
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
    return { href, label: isId ? "Detalle" : (segmentLabels[segment] ?? segment), last: index === segments.length - 1 };
  });

  return (
    <nav aria-label="Ruta de navegación" className="admin-breadcrumbs">
      <ol>
        {crumbs.map((crumb) => (
          <li key={crumb.href}>
            {crumb.last ? <span aria-current="page">{crumb.label}</span> : <Link href={crumb.href}>{crumb.label}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function AdminShell({ children, email, role }: { children: React.ReactNode; email: string; role: AdminRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const availableNavigation = useMemo(
    () => navigation.filter((item) => !item.roles || item.roles.includes(role)),
    [role],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => setCollapsed(window.localStorage.getItem("castelao-admin-sidebar") === "collapsed"), 0);
    return () => window.clearTimeout(timer);
  }, []);

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

  return (
    <div className="admin-shell" data-collapsed={collapsed ? "true" : "false"}>
      <button
        aria-label="Cerrar navegación"
        className="admin-sidebar-overlay"
        data-open={mobileOpen ? "true" : "false"}
        onClick={() => setMobileOpen(false)}
        type="button"
      />
      <aside aria-label="Navegación administrativa" className="admin-sidebar" data-mobile-open={mobileOpen ? "true" : "false"}>
        <div className="admin-sidebar-header">
          <Link aria-label="Ir al resumen administrativo" className="admin-brand" href="/admin">
            <BrandLogo />
            <span className="admin-brand-context">Administración</span>
          </Link>
          <button aria-label="Cerrar navegación" className="admin-icon-button admin-sidebar-mobile-close" onClick={() => setMobileOpen(false)} type="button">
            <X aria-hidden="true" size={20} />
          </button>
        </div>

        <nav className="admin-navigation" aria-label="Secciones">
          <p className="admin-navigation-label">Principal</p>
          {availableNavigation.map((item) => {
            const active = isActivePath(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className="admin-navigation-link"
                data-tooltip={item.label}
                href={item.href}
                key={item.href}
                onClick={() => setMobileOpen(false)}
              >
                <Icon aria-hidden="true" size={19} strokeWidth={1.9} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar-footer">
          <Link aria-current={pathname.startsWith("/admin/perfil") ? "page" : undefined} className="admin-navigation-link" data-tooltip="Mi perfil" href="/admin/perfil" onClick={() => setMobileOpen(false)}>
            <UserRound aria-hidden="true" size={19} />
            <span>Mi perfil</span>
          </Link>
          <div className="admin-sidebar-account">
            <span className="admin-avatar" aria-hidden="true">{getInitials(email)}</span>
            <span className="admin-sidebar-account-copy"><strong>{email}</strong><small>{roleLabels[role]}</small></span>
          </div>
        </div>
      </aside>

      <div className="admin-workspace">
        <header className="admin-topbar">
          <div className="admin-topbar-start">
            <button aria-label="Abrir navegación" className="admin-icon-button admin-mobile-trigger" onClick={() => setMobileOpen(true)} type="button">
              <Menu aria-hidden="true" size={21} />
            </button>
            <button
              aria-label={collapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
              className="admin-icon-button admin-desktop-trigger"
              onClick={toggleCollapsed}
              type="button"
            >
              {collapsed ? <PanelLeftOpen aria-hidden="true" size={21} /> : <PanelLeftClose aria-hidden="true" size={21} />}
            </button>
            <div className="admin-topbar-heading">
              <AdminBreadcrumbs pathname={pathname} />
              <strong>{pageName}</strong>
            </div>
          </div>

          <details className="admin-user-menu">
            <summary>
              <span className="admin-avatar" aria-hidden="true">{getInitials(email)}</span>
              <span className="admin-user-menu-copy"><strong>{email}</strong><small>{roleLabels[role]}</small></span>
              <ChevronDown aria-hidden="true" size={16} />
            </summary>
            <div className="admin-user-menu-panel">
              <div className="admin-user-menu-identity"><strong>{email}</strong><span>{roleLabels[role]}</span></div>
              <Link href="/admin/perfil"><UserRound aria-hidden="true" size={17} /> Mi perfil</Link>
              <Link href="/admin/perfil#seguridad"><LockKeyhole aria-hidden="true" size={17} /> Cambiar contraseña</Link>
              <button disabled={isSigningOut} onClick={signOut} type="button">
                <LogOut aria-hidden="true" size={17} /> {isSigningOut ? "Cerrando…" : "Cerrar sesión"}
              </button>
            </div>
          </details>
        </header>
        <main className="admin-main" id="admin-content"><div className="admin-content">{children}</div></main>
      </div>
    </div>
  );
}
