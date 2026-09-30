import { PageHeader } from "@/components/admin/admin-ui";
import { ProfessionalEditor } from "@/components/admin/cms-editor";
import { requireAdmin } from "@/lib/auth/admin";
export default async function NewProfessional() { const admin = await requireAdmin(["superadmin", "editor"]); return <><PageHeader title="Nuevo profesional" description="Publica solo información y fotografías autorizadas." eyebrow="Equipo" /><ProfessionalEditor person={null} userId={admin.user.id} /></>; }
