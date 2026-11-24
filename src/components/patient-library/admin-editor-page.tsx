import { notFound } from "next/navigation";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { AdminPanel, PageHeader } from "@/components/admin/admin-ui";
import { requireLibraryStaffPage } from "@/lib/patient-library/admin-page";
import { sanitizeTherapeuticHtml } from "@/lib/patient-library/html";
import { MaterialEditor } from "./material-editor";
import { LibraryUploadForm } from "./upload-form";
import { manageLibraryAction } from "@/app/admin/(secured)/library-actions";
import { uuid } from "@/lib/patient-library/policy";

export async function AdminMaterialEditorPage({id}:{id?:string}) {
  const {client,admin}=await requireLibraryStaffPage("content");
  if(id && !uuid.safeParse(id).success) notFound();
  const [{data:areas,error:aError},{data:folders,error:fError},{data:groups,error:gError},{data:recipients,error:rError}]=await Promise.all([
    client.from("therapy_areas").select("*").order("sort_order"),client.from("patient_library_folders").select("*").order("name"),client.from("therapy_groups").select("*"),client.rpc("library_recipients",{}),
  ]);if(aError || fError || gError || rError) throw new Error("No fue posible cargar las opciones del editor.");
  const {data:material}=id ? await client.from("patient_library_materials").select("*").eq("id",id).maybeSingle() : {data:null};
  if(id && !material) notFound();
  const [{data:groupGrants},{data:patientGrants},{data:attachments}]=id ? await Promise.all([
    client.from("patient_library_group_grants").select("group_id").eq("material_id",id),client.from("patient_library_patient_grants").select("patient_id").eq("material_id",id),client.from("patient_library_attachments").select("*").eq("material_id",id).neq("state","retired").order("created_at"),
  ]) : [{data:[]},{data:[]},{data:[]}];
  const patients=(recipients ?? []) as {id:string;display_name:string}[];
  return <><PageHeader title={id ? "Editar material terapéutico" : "Nuevo material terapéutico"} description="Contenido privado. Revisa siempre los destinatarios antes de publicar."/>
    <AdminPanel><MaterialEditor key={`${id}-${material?.version}`} material={material ? {...material,body:sanitizeTherapeuticHtml(material.body)} : null} areas={areas ?? []} folders={folders ?? []} groups={groups ?? []} patients={patients} groupIds={groupGrants?.map(g=>g.group_id) ?? []} patientIds={patientGrants?.map(p=>p.patient_id) ?? []} userId={admin.user.id}/></AdminPanel>
    {material && <AdminPanel title="Adjuntos privados" description="Guarda primero cualquier edición pendiente. Los archivos se validan en servidor; estos controles no equivalen a un antivirus.">
      <div className="library-attachments">{attachments?.map(a=><article key={a.id} className="library-attachment-row"><strong>{a.original_name}</strong><p>{a.state} · {(a.bytes/1024/1024).toFixed(2)} MB</p>{a.state==="ready" && <a href={`/api/pacientes/archivos/${a.id}?staff=1`}>Descargar como staff autorizado</a>}
        {a.state==="ready" && <LibraryUploadForm materialId={material.id} version={material.version} replacesId={a.id}/>}
        <AdminActionForm action={manageLibraryAction} className="admin-form" confirmMessage="Retirar este adjunto del material? Se conservará el objeto para una limpieza controlada posterior."><input name="op" value="attachment_retire" type="hidden"/><input name="id" value={a.id} type="hidden"/><input name="version" value={material.version} type="hidden"/><input name="material_id" value={material.id} type="hidden"/><AdminSubmitButton>Retirar adjunto</AdminSubmitButton></AdminActionForm></article>)}</div>
      <LibraryUploadForm materialId={material.id} version={material.version}/>
    </AdminPanel>}
    {material && <AdminPanel title="Vista de paciente" description="Solo muestra el material publicado si el resolver autoriza al destinatario elegido."><form method="get" action={`/admin/biblioteca/${material.id}/vista-previa`} className="admin-form"><label>Paciente<select name="paciente" required><option value="">Seleccionar</option>{patients.map(p=><option value={p.id} key={p.id}>{p.display_name}</option>)}</select></label><button className="admin-button admin-button-secondary">Comprobar vista de paciente</button></form></AdminPanel>}
  </>;
}
