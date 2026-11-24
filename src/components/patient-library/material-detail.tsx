import { FileText, Download } from "lucide-react";
import { AttachmentReader } from "./attachment-reader";
import { sanitizeTherapeuticHtml } from "@/lib/patient-library/html";
import { materialKinds } from "@/lib/patient-library/policy";
import type { PatientMaterialDetail } from "@/types/patient-library";

export function MaterialDetail({detail,staffPatientId}:{detail:PatientMaterialDetail;staffPatientId?:string}) {
  const {material,attachments}=detail;
  const suffix=staffPatientId ? `&staff=1&paciente=${staffPatientId}` : "";
  return <article className="library-detail"><p className="library-eyebrow">{materialKinds[material.kind]}{material.session_date && ` · Sesión ${new Date(material.session_date+"T12:00:00Z").toLocaleDateString("es-CL",{timeZone:"UTC"})}`}</p><h1>{material.title}</h1><p className="library-lead">{material.description}</p>
    {material.body && <div className="article-body library-body" dangerouslySetInnerHTML={{__html:sanitizeTherapeuticHtml(material.body)}}/>}
    {attachments.length>0 && <section className="library-panel"><h2>Archivos</h2><div className="library-attachments">{attachments.map(a=><article className="library-file" key={a.id}><FileText aria-hidden="true" size={26}/><div><h3>{a.original_name}</h3><small>{(a.bytes/1024/1024).toFixed(2)} MB</small><div className="library-file-actions">
      <a href={`/api/pacientes/archivos/${a.id}?descarga=1${suffix}`}><Download size={16} aria-hidden="true"/> Descargar original</a></div></div><AttachmentReader attachment={a} suffix={suffix}/></article>)}</div><p className="library-footnote">Lee los archivos aquí sin salir de la aplicación. La vista de lectura de Office prioriza el contenido; puedes descargar el original para conservar su diseño.</p></section>}
  </article>;
}
