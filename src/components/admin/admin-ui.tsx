import type { LucideIcon } from "lucide-react";
import { CircleAlert, Inbox, SearchX, ToggleLeft } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";
import type { AdminRole, ContactSubmissionStatus, ContentKind, ContentStatus } from "@/types/database";

export function PageHeader({ actions, description, eyebrow, title }: { actions?: React.ReactNode; description: string; eyebrow?: string; title: string }) {
  return (
    <header className="admin-page-header">
      <div>{eyebrow && <p className="admin-eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{description}</p></div>
      {actions && <div className="admin-page-actions">{actions}</div>}
    </header>
  );
}

export function MetricCard({ detail, icon: Icon, label, value }: { detail?: string; icon: LucideIcon; label: string; value: React.ReactNode }) {
  return <article className="admin-metric-card"><div className="admin-metric-card-heading"><span>{label}</span><Icon aria-hidden="true" size={18} /></div><strong>{value}</strong>{detail && <small>{detail}</small>}</article>;
}

const labels: Record<AdminRole | ContactSubmissionStatus | ContentKind | ContentStatus, string> = {
  archived: "Archivado", blog: "Blog", closed: "Cerrada", draft: "Borrador", editor: "Editor", in_progress: "En progreso", new: "Nueva", news: "Noticia", published: "Publicado", spam: "Spam", superadmin: "Superadministrador", viewer: "Solo lectura",
};

export function StatusBadge({ value }: { value: keyof typeof labels | "active" | "inactive" }) {
  const label = value === "active" ? "Activo" : value === "inactive" ? "Revocado" : labels[value];
  return <span className="admin-status" data-status={value}>{label}</span>;
}

export function FilterTabs({ items, label }: { items: { active: boolean; href: string; label: string; count?: number }[]; label: string }) {
  return <nav aria-label={label} className="admin-filter-tabs">{items.map((item) => <Link aria-current={item.active ? "page" : undefined} href={item.href} key={item.href}>{item.label}{typeof item.count === "number" && <span>{item.count}</span>}</Link>)}</nav>;
}

export function StatePanel({ action, description, icon: Icon = Inbox, title, tone = "empty" }: { action?: React.ReactNode; description: string; icon?: LucideIcon; title: string; tone?: "disabled" | "empty" | "error" | "filter" }) {
  const ResolvedIcon = tone === "disabled" ? ToggleLeft : tone === "filter" ? SearchX : tone === "error" ? CircleAlert : Icon;
  return <section className="admin-state" data-tone={tone}><span className="admin-state-icon"><ResolvedIcon aria-hidden="true" size={24} /></span><div><h2>{title}</h2><p>{description}</p>{action && <div className="admin-state-action">{action}</div>}</div></section>;
}

export function AdminNotice({ children, tone = "success" }: { children: React.ReactNode; tone?: "success" | "error" | "info" }) {
  return <div className="admin-notice" data-tone={tone} role={tone === "error" ? "alert" : "status"}>{children}</div>;
}

export function AdminPanel({ children, className, title, description }: { children: React.ReactNode; className?: string; title?: string; description?: string }) {
  return <section className={cn("admin-panel", className)}>{(title || description) && <header className="admin-panel-header">{title && <h2>{title}</h2>}{description && <p>{description}</p>}</header>}{children}</section>;
}

export function PrimaryLink({ children, href }: { children: React.ReactNode; href: string }) { return <Link className="admin-button admin-button-primary" href={href}>{children}</Link>; }
export function SecondaryLink({ children, href }: { children: React.ReactNode; href: string }) { return <Link className="admin-button admin-button-secondary" href={href}>{children}</Link>; }
