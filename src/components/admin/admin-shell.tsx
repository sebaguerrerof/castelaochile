"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { AdminRole } from "@/types/database";

type NavigationItem = { href: string; label: string; minimumRole?: "editor" };

const navigation: NavigationItem[] = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/analitica", label: "Analítica" },
  { href: "/admin/consultas", label: "Consultas", minimumRole: "editor" },
  { href: "/admin/contenidos", label: "Contenidos" },
];

export function AdminShell({ children, email, role }: { children: React.ReactNode; email: string; role: AdminRole }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const availableNavigation = navigation.filter((item) => !item.minimumRole || role !== "viewer");

  async function signOut() {
    setIsSigningOut(true);
    try {
      await createBrowserSupabaseClient().auth.signOut();
    } finally {
      router.replace("/admin/login");
      router.refresh();
    }
  }

  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Link className="admin-brand" href="/admin">Instituto Castelao <span>Administración</span></Link>
      <nav aria-label="Navegación administrativa" className="admin-navigation">
        {availableNavigation.map((item) => <Link href={item.href} key={item.href}>{item.label}</Link>)}
        {role === "superadmin" && <Link href="/admin/usuarios">Usuarios</Link>}
      </nav>
      <div className="admin-account">
        <span>{email}</span>
        <small>{role}</small>
        <button disabled={isSigningOut} onClick={signOut} type="button">{isSigningOut ? "Cerrando…" : "Cerrar sesión"}</button>
      </div>
    </aside>
    <main className="admin-main">{children}</main>
  </div>;
}
