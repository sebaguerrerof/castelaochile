import { AdminNotice, PageHeader } from "@/components/admin/admin-ui";
import { SettingsEditor } from "@/components/admin/cms-editor";
import { getSettingsEditorState } from "@/lib/cms/repository";
import { requireAdmin } from "@/lib/auth/admin";
export default async function Configuration({ searchParams }: { searchParams: Promise<{ success?: string }> }) { await requireAdmin(["superadmin", "editor"]); const editor = await getSettingsEditorState(); const { success } = await searchParams; return <><PageHeader title="Configuración" description="Datos compartidos por navegación, contacto y CTA. Completa únicamente valores confirmados." eyebrow="CMS" />{success === "saved" && <AdminNotice>Configuración guardada.</AdminNotice>}<SettingsEditor key={editor.draft_updated_at ?? editor.updated_at} {...editor} /></>; }
