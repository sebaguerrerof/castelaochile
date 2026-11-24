"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Eye, X } from "lucide-react";
import type { LibraryAttachment } from "@/types/patient-library";
import type { PDFDocumentProxy } from "pdfjs-dist";
import "./attachment-reader.css";

export function AttachmentReader({attachment,suffix}:{attachment:Pick<LibraryAttachment,"id"|"original_name"|"mime">;suffix:string}) {
  const [open,setOpen]=useState(false),[error,setError]=useState(""),[loading,setLoading]=useState(false);
  const [document,setDocument]=useState<PDFDocumentProxy|null>(null),[page,setPage]=useState(1),[text,setText]=useState(""),[html,setHtml]=useState(""),[note,setNote]=useState("");
  const [image,setImage]=useState(""); const canvas=useRef<HTMLCanvasElement>(null),reader=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
  const fileURL=`/api/pacientes/archivos/${attachment.id}?vista=1${suffix}`;
  useEffect(()=>{
    if(!open) return;
    const controller=new AbortController(); let cancelled=false,handedOff=false,task:ReturnType<typeof import("pdfjs-dist").getDocument>|undefined,objectURL:string|undefined;
    async function load() {
      setLoading(true);setError("");reader.current?.focus();
      try {
        if(attachment.mime==="application/pdf") {
          const response=await fetch(fileURL,{cache:"no-store",credentials:"same-origin",signal:controller.signal});
          if(!response.ok) throw new Error("Archivo no disponible. Puede haber cambiado tu acceso.");
          const bytes=new Uint8Array(await response.arrayBuffer());
          const pdfjs=await import("pdfjs-dist/legacy/build/pdf.mjs");
          pdfjs.GlobalWorkerOptions.workerSrc="/readers/pdf-6.4.299.worker.mjs";
          task=pdfjs.getDocument({data:bytes,useSystemFonts:true,disableAutoFetch:true,disableStream:true,cMapUrl:"/readers/pdf-6.4.299/cmaps/",cMapPacked:true,standardFontDataUrl:"/readers/pdf-6.4.299/standard_fonts/",wasmUrl:"/readers/pdf-6.4.299/wasm/"});
          const loaded=await task.promise;
          if(cancelled){await task.destroy();return;} handedOff=true;setDocument(loaded);setPage(1);
        } else if(attachment.mime.startsWith("image/")) {
          const response=await fetch(fileURL,{cache:"no-store",credentials:"same-origin",signal:controller.signal});
          if(!response.ok) throw new Error("Archivo no disponible. Puede haber cambiado tu acceso.");
          objectURL=URL.createObjectURL(await response.blob());if(!cancelled)setImage(objectURL);
        } else {
          const response=await fetch(fileURL+"&lectura=1",{cache:"no-store",credentials:"same-origin",signal:controller.signal});
          if(!response.ok) throw new Error("No pudimos abrir la vista de lectura. Puedes descargar el original si tu acceso sigue vigente.");
          const value=await response.json();if(!cancelled){setHtml(value.html);setNote(value.note);}
        }
      } catch(reason) {if(!cancelled)setError(reason instanceof Error ? reason.message : "No pudimos abrir el archivo.");}
      finally {if(!cancelled && !handedOff)setLoading(false);}
    }
    void load();
    return ()=>{cancelled=true;controller.abort();void task?.destroy();if(objectURL)URL.revokeObjectURL(objectURL);setDocument(null);setImage("");setHtml("");setText("");};
  },[open,fileURL,attachment.mime]);
  useEffect(()=>{
    if(!document || !open) return;
    let cancelled=false,render:ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>|undefined;
    async function draw() {
      setLoading(true);setError("");
      try {
        const current=await document!.getPage(page);if(cancelled || !canvas.current)return;
        const viewport=current.getViewport({scale:1}); const available=Math.max(180,Math.min(reader.current?.clientWidth ?? 700,900)-40);
        const scale=Math.min(available/viewport.width,2),ratio=Math.min(window.devicePixelRatio || 1,2);
        const sized=current.getViewport({scale:scale*ratio});canvas.current.width=sized.width;canvas.current.height=sized.height;
        canvas.current.style.width=`${sized.width/ratio}px`;canvas.current.style.maxWidth="100%";
        render=current.render({canvas:canvas.current,viewport:sized});await render.promise;
        const content=await current.getTextContent();
        if(!cancelled)setText(content.items.map(item=>"str" in item ? item.str+(item.hasEOL ? "\n" : " ") : "").join(""));
      } catch(reason) {if(!cancelled)setError(reason instanceof Error ? "No pudimos mostrar esta página. Puedes descargar el original." : "No pudimos mostrar esta página.");}
      finally {if(!cancelled)setLoading(false);}
    }
    void draw(); return ()=>{cancelled=true;render?.cancel();};
  },[document,page,open]);
  return <div className="library-reader-control"><button ref={trigger} type="button" className="library-read-button" aria-expanded={open} onClick={()=>{setOpen(value=>!value);}}><Eye size={16} aria-hidden="true"/>{open ? "Cerrar lectura" : "Leer aquí"}</button>
    {open && <div ref={reader} tabIndex={-1} className="library-reader" role="region" aria-label={`Lectura de ${attachment.original_name}`}>
      <header className="library-reader-toolbar"><strong>{attachment.original_name}</strong><button type="button" aria-label="Cerrar lectura" onClick={()=>{setOpen(false);trigger.current?.focus();}}><X size={19} aria-hidden="true"/></button></header>
      {loading && <p role="status">Cargando lectura…</p>}{error && <p role="alert">{error}</p>}
      {attachment.mime==="application/pdf" && <><nav className="library-reader-pages" aria-label="Páginas del PDF"><button type="button" disabled={!document || page<=1 || loading} onClick={()=>setPage(value=>value-1)}><ChevronLeft size={17} aria-hidden="true"/>Anterior</button><span aria-live="polite">Página {page} de {document?.numPages ?? "…"}</span><button type="button" disabled={!document || page>=(document?.numPages ?? 0) || loading} onClick={()=>setPage(value=>value+1)}>Siguiente<ChevronRight size={17} aria-hidden="true"/></button></nav><canvas ref={canvas} aria-label={`Página ${page} del PDF`}/>{text && <details className="library-reader-text"><summary>Leer el texto de esta página</summary><p>{text}</p></details>}</>}
      {image && <img src={image} alt={attachment.original_name}/>}
      {html && <div className="article-body library-reader-document" dangerouslySetInnerHTML={{__html:html}}/>}
      {note && <p className="library-footnote">{note}</p>}
    </div>}
  </div>;
}
