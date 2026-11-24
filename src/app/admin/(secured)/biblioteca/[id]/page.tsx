import Link from "next/link";
import { notFound } from "next/navigation";
import { requireLibraryStaffPage } from "@/lib/patient-library/admin-page";
import { sanitizeTherapeuticHtml } from "@/lib/patient-library/html";
import { materialKinds,uuid } from "@/lib/patient-library/policy";
import { AdminPanel, PageHeader } from "@/components/admin/admin-ui";
export default async function StaffMaterialPage({params}:{params:Promise<{id:string}>}) {
  const {client}=await requireLibraryStaffPage("read");const {id}=await params;if(!uuid.safeParse(id).success)notFound();
  const {data:m,error}=await client.from("patient_library_materials").select("*").eq("id",id).maybeSingle();if(error)throw new Error("No fue posible cargar el material.");if(!m)notFound();
  const {data:files}=await client.from("patient_library_attachments").select("id,original_name").eq("material_id",id).eq("state","ready");
  return <><Link prefetch={false} href="/admin/biblioteca">← Biblioteca</Link><PageHeader title={m.title} description={`${materialKinds[m.kind]} · ${m.status} · Vista de staff autorizado`}/><AdminPanel><p>{m.description}</p><div className="article-body" dangerouslySetInnerHTML={{__html:sanitizeTherapeuticHtml(m.body)}}/>{files?.map(f=><p key={f.id}><a href={`/api/pacientes/archivos/${f.id}?staff=1`}>{f.original_name}</a></p>)}</AdminPanel></>;
}
