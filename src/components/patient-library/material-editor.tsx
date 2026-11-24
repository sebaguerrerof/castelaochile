"use client";
import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminDialogActions } from "@/components/admin/admin-form-dialog";
import { AdminActionForm } from "@/components/admin/admin-action-form";
import { AdminSubmitButton } from "@/components/admin/admin-submit-button";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { saveLibraryMaterial, saveLibraryMaterialInPlace } from "@/app/admin/(secured)/library-actions";
import type { AdminActionState } from "@/lib/admin-action-state";
import { discardIncompleteUpload, LibraryUploadError, uploadLibraryFile } from "./upload-client";
import { materialKinds } from "@/lib/patient-library/policy";
import type { LibraryFolder, LibraryMaterial, TherapyArea, TherapyGroup } from "@/types/patient-library";

function MaterialFields({children}:{children:React.ReactNode}) {
  const {pending}=useFormStatus();
  return <fieldset className="library-editor-fields" disabled={pending}>{children}</fieldset>;
}
export function MaterialEditor({material,areas,folders,groups,patients,groupIds,patientIds,userId,inline=false}:{material:LibraryMaterial | null;areas:TherapyArea[];folders:LibraryFolder[];groups:TherapyGroup[];patients:{id:string;display_name:string}[];groupIds:string[];patientIds:string[];userId:string;inline?:boolean}) {
  const root=useRef<HTMLDivElement>(null),draft=useRef<{id:string;version:number}|null>(null),attempt=useRef<string|undefined>(undefined);
  const attemptedFile=useRef<number|null>(null),selectedFile=useRef(0);
  const [savedDraft,setSavedDraft]=useState<string|null>(null),[resetKey,setResetKey]=useState(0),[uploadMessage,setUploadMessage]=useState("");
  const router=useRouter();
  const [audience,setAudience]=useState(material?.audience ?? "all");const [kind,setKind]=useState(material?.kind ?? "activity");const [area,setArea]=useState(material?.area_id ?? areas[0]?.id ?? "");
  const [selectedPatients,setSelectedPatients]=useState(patientIds);const [selectedGroups,setSelectedGroups]=useState(groupIds);
  const audienceLabel=audience==="all" ? "Todos los pacientes activos, incluidos los que se incorporen en el futuro." : audience==="groups" ? selectedGroups.map(id=>groups.find(g=>g.id===id)?.name ?? "Grupo no disponible").join(", ") : selectedPatients.map(id=>patients.find(p=>p.id===id)?.display_name ?? "Paciente no disponible").join(", ");
  async function saveInDialog(_:AdminActionState,data:FormData):Promise<AdminActionState> {
    const file=data.get("optional_file"); data.delete("optional_file");
    const hasFile=file instanceof File && file.size>0;
    const target=String(data.get("status"));
    setUploadMessage("");
    if(hasFile && file.size>20*1024*1024) return {status:"error",message:"El archivo supera los 20 MB. Elige uno más pequeño."};
    if(draft.current) {data.set("id",draft.current.id);data.set("version",String(draft.current.version));}
    try {
      if(hasFile || attempt.current) data.set("status","draft");
      const prepared=await saveLibraryMaterialInPlace(data);
      if(!prepared.ok) return prepared.state;
      draft.current={id:prepared.id,version:prepared.version};setSavedDraft(prepared.id);
      if(hasFile) {
        setUploadMessage("Borrador guardado. Validando y cargando el archivo…");
        const reuse=attemptedFile.current===selectedFile.current;
        attemptedFile.current=selectedFile.current;
        const uploaded=await uploadLibraryFile(file,prepared.id,prepared.version,attempt.current,reuse);
        attempt.current=uploaded.id; draft.current.version=uploaded.version;
      } else if(attempt.current) {
        draft.current.version=await discardIncompleteUpload(attempt.current);
        attempt.current=undefined;attemptedFile.current=null;
      }
      if(hasFile || data.get("status")!==target) {
        data.set("id",prepared.id);data.set("version",String(draft.current.version));data.set("status",target);
        const finished=await saveLibraryMaterialInPlace(data);
        if(!finished.ok) {setUploadMessage("El archivo está guardado en el borrador. Revisa el mensaje antes de publicar.");return finished.state;}
        draft.current.version=finished.version;
      }
      root.current?.dispatchEvent(new CustomEvent("admin-form-saved",{bubbles:true}));
      draft.current=null;attempt.current=undefined;attemptedFile.current=null;setSavedDraft(null);setUploadMessage("");
      setAudience("all");setKind("activity");setArea(areas[0]?.id ?? "");setSelectedPatients([]);setSelectedGroups([]);setResetKey(value=>value+1);
      router.refresh();return {status:"idle"};
    } catch(error) {
      if(error instanceof LibraryUploadError) {attempt.current=error.attachmentId;if(error.version && draft.current) draft.current.version=error.version;}
      setUploadMessage("El material sigue en borrador y conserva sus destinatarios. Puedes reintentar o abrir su edición.");
      return {status:"error",message:error instanceof Error ? error.message : "No pudimos confirmar el archivo. Conservamos el borrador."};
    }
  }
  return <div ref={root} className={inline ? "library-material-modal" : undefined}><AdminActionForm key={`${material?.id}-${material?.version}-${resetKey}`} action={inline ? saveInDialog : saveLibraryMaterial} className="admin-form" warnOnUnsavedChanges><MaterialFields>
    <input type="hidden" name="id" value={material?.id ?? ""}/><input type="hidden" name="version" value={material?.version ?? 0}/>
    <label>Título<input name="title" defaultValue={material?.title} required minLength={3} maxLength={160}/></label>
    <label>Descripción<textarea name="description" defaultValue={material?.description} maxLength={600}/></label>
    <label>Área<select aria-label="Área" name="area_id" value={area} onChange={e=>setArea(e.target.value)} required>{areas.filter(a=>a.is_active).map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <label>Carpeta<select aria-label="Carpeta" name="folder_id" defaultValue={material?.folder_id ?? ""}><option value="">Raíz del área</option>{folders.filter(f=>f.area_id===area && f.is_active).map(f=><option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
    <label>Tipo<select aria-label="Tipo" name="kind" value={kind} onChange={e=>{const k=e.target.value as typeof kind;setKind(k);if(k==="report")setAudience("patients");}}>{Object.entries(materialKinds).map(([k,label])=><option key={k} value={k}>{label}</option>)}</select></label>
    <label>Fecha de sesión (opcional)<input name="session_date" type="date" defaultValue={material?.session_date ?? ""}/></label>
    <label>Etiquetas, separadas por comas<input name="tags" defaultValue={material?.tags.join(", ")} maxLength={800}/></label>
    {inline && <div className="library-optional-upload"><label>Archivo opcional<input name="optional_file" type="file" accept=".pdf,.doc,.docx,.xlsx,.pptx,.jpg,.jpeg,.png,.webp" onChange={()=>{selectedFile.current++;}}/></label><p className="admin-form-help">PDF, Word, Excel, PowerPoint o imagen · hasta 20 MB. Puedes guardar sin archivo. El paciente podrá abrir la vista de lectura dentro de su biblioteca.</p></div>}
    <div><p>Texto del material</p><RichTextEditor initialHtml={material?.body ?? ""} name="body" userId={userId} privateMode/></div>
    <label>Audiencia<select aria-label="Audiencia" name="audience" value={audience} onChange={e=>setAudience(e.target.value as typeof audience)}><option disabled={kind==="report"} value="all">Todos los pacientes activos</option><option disabled={kind==="report"} value="groups">Grupos específicos</option><option value="patients">Pacientes específicos</option></select></label>
    {audience==="groups" && <fieldset><legend>Grupos destinatarios</legend><div className="library-checkboxes">{groups.map(g=><label key={g.id}><input type="checkbox" name="groups" value={g.id} checked={selectedGroups.includes(g.id)} onChange={e=>setSelectedGroups(ids=>e.target.checked ? [...ids,g.id] : ids.filter(id=>id!==g.id))}/>{g.name}{!g.is_active && " (inactivo)"}</label>)}</div></fieldset>}
    {audience==="patients" && <fieldset><legend>Pacientes destinatarios{kind==="report" && " (exactamente uno)"}</legend><div className="library-checkboxes">{patients.map(p=><label key={p.id}><input type="checkbox" name="patients" value={p.id} checked={selectedPatients.includes(p.id)} onChange={e=>setSelectedPatients(ids=>e.target.checked ? [...ids,p.id] : ids.filter(id=>id!==p.id))}/>{p.display_name}</label>)}</div></fieldset>}
    <div className="library-audience"><strong>Audiencia efectiva</strong><p>{audienceLabel || "Selecciona destinatarios antes de guardar."}</p><p>La carpeta organiza el material; moverlo no cambia estos destinatarios.</p></div>
    {material && <label><input type="checkbox" name="confirm_audience"/> Confirmo explícitamente cualquier cambio de audiencia o destinatarios</label>}
    <label>Estado<select aria-label="Estado" name="status" defaultValue={material?.status ?? "draft"}><option value="draft">Borrador</option><option value="published">Publicado</option><option value="archived">Archivado</option></select></label>
    <label><input name="confirm_publish" type="checkbox"/> He revisado el contenido y la audiencia efectiva para publicar</label>
    <p className="admin-form-help">{inline ? "Para publicar, agrega texto o un archivo y confirma los destinatarios. Si adjuntas, validaremos la carga antes de publicar." : "Guardar como publicado actualiza inmediatamente lo visible. No hay un borrador paralelo. Guarda primero el material para habilitar adjuntos."}</p>
    {uploadMessage && <p role="status" className="admin-notice">{uploadMessage}</p>}
    {inline && savedDraft && <Link prefetch={false} href={`/admin/biblioteca/${savedDraft}/editar`}>Abrir el borrador guardado</Link>}
    <AdminDialogActions><AdminSubmitButton>Guardar material</AdminSubmitButton></AdminDialogActions>
  </MaterialFields></AdminActionForm></div>;
}
