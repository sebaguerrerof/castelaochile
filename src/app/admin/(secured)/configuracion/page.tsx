import { AdminNotice, PageHeader } from "@/components/admin/admin-ui";
import { SettingsEditor } from "@/components/admin/cms-editor";
import { getSiteSettings } from "@/lib/cms/repository";
import { requireAdmin } from "@/lib/auth/admin";
export default async function Configuration({ searchParams }: { searchParams: Promise<{ success?: string }> }) { await requireAdmin(["superadmin", "editor"]); const settings = await getSiteSettings(); const { success } = await searchParams; return <><PageHeader title="Configuración" description="Datos compartidos por navegación, contacto y CTA. Completa únicamente valores confirmados." eyebrow="CMS" />{success === "saved" && <AdminNotice>Configuración guardada.</AdminNotice>}<SettingsEditor settings={settings} /></>; }
