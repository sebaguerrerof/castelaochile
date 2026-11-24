"use client";
import Image from "next/image";
import { ImagePlus, LoaderCircle, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { uploadContentImage } from "@/lib/content-image-upload";
import { assets } from "@/config/assets";

export function MediaPicker({ value, alt, onChange, userId, portrait = false, onBusyChange }: { value: string; alt: string; onChange: (value: string) => void; userId: string; portrait?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ value: string; src: string } | null>(null);
  const [message, setMessage] = useState("");
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState<string[]>([]);
  const previewSrc = value.startsWith("/images/") ? value : preview?.value === value ? preview.src : "";
  useEffect(() => {
    let active = true;
    createBrowserSupabaseClient().storage.from("content-images").list(userId, { limit: 100, sortBy: { column: "created_at", order: "desc" } }).then(({ data }) => { if (active) setLibrary((data ?? []).filter((file) => /\.(?:jpg|jpeg|png|webp)$/i.test(file.name)).map((file) => `/api/public/media/content/${userId}/${file.name}`)); });
    return () => { active = false; };
  }, [userId]);
  useEffect(() => {
    let active = true;
    if (!value || value.startsWith("/images/")) return;
    const path = value.replace("/api/public/media/content/", "");
    createBrowserSupabaseClient().storage.from("content-images").createSignedUrl(path, 600).then(({ data }) => { if (active) setPreview({ value, src: data?.signedUrl ?? "" }); });
    return () => { active = false; };
  }, [value]);
  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0]; if (!file) return;
    setBusy(true); onBusyChange?.(true); setMessage(""); setFailed(false);
    try {
      const path = await uploadContentImage(file, userId);
      const src = `/api/public/media/content/${path}`;
      onChange(src);
      setLibrary((current) => [src, ...current.filter((item) => item !== src)]);
      setMessage("Imagen cargada. Guarda el contenido para asociarla.");
    }
    catch (error) { setFailed(true); setMessage(error instanceof Error ? error.message : "No fue posible subir la imagen."); }
    finally { setBusy(false); onBusyChange?.(false); input.value = ""; }
  }
  return <div aria-busy={busy} className={`admin-media-picker${portrait ? " admin-media-picker--portrait" : ""}`}>
    <div className="admin-media-preview">{previewSrc ? <Image alt={alt || "Vista previa de imagen"} height={portrait ? 400 : 240} src={previewSrc} unoptimized width={portrait ? 320 : 360} /> : <div className="admin-media-placeholder"><ImagePlus aria-hidden="true" size={32} /><span>{value ? "Vista previa de la imagen" : portrait ? "Sin fotografía" : "Sin imagen"}</span></div>}</div>
    <div className="admin-media-controls">
      <input accept="image/jpeg,image/png,image/webp" aria-label="Cargar o reemplazar imagen" className="admin-media-input" disabled={busy} id={id} onChange={upload} ref={fileInput} tabIndex={-1} type="file" />
      <button className="admin-button admin-button-primary" disabled={busy} onClick={() => fileInput.current?.click()} type="button">{busy ? <LoaderCircle aria-hidden="true" className="admin-spin" size={17} /> : <Upload aria-hidden="true" size={17} />}{busy ? "Subiendo imagen…" : value ? "Cambiar imagen" : "Subir imagen"}</button>
      <p className="admin-form-help">Selecciona un archivo de tu computador. JPG, PNG o WebP, hasta 5 MB.{portrait && " Recomendamos una fotografía vertical, con el rostro centrado."}</p>
      <p className="admin-form-help" data-error={failed || undefined} role="status">{busy ? "Cargando… Espera antes de guardar." : message || "Después de elegir la imagen, guarda los cambios del contenido."}</p>
      <details className="admin-media-library"><summary>Elegir una imagen existente</summary>
        <label htmlFor={`${id}-library`}>Imágenes del sitio</label><select disabled={busy} id={`${id}-library`} onChange={(event) => { if (event.target.value) onChange(event.target.value); }} value={value.startsWith("/images/") ? value : ""}><option value="">Seleccionar</option>{Object.values(assets.images).map((asset) => <option key={asset.src} value={asset.src}>{asset.alt}</option>)}</select>
        <label htmlFor={`${id}-uploads`}>Mis imágenes cargadas</label><select disabled={busy} id={`${id}-uploads`} onChange={(event) => { if (event.target.value) onChange(event.target.value); }} value={library.includes(value) ? value : ""}><option value="">Seleccionar</option>{library.map((src) => <option key={src} value={src}>{src.split("/").at(-1)}</option>)}</select>
      </details>
      {value && <button className="admin-button admin-button-secondary" disabled={busy} onClick={() => { onChange(""); setMessage("Imagen quitada de la ficha. Guarda los cambios para confirmar."); setFailed(false); }} type="button">Quitar imagen del contenido</button>}
    </div>
  </div>;
}
