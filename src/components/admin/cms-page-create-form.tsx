"use client";
import { createEditorialPage } from "@/app/admin/(secured)/cms-actions";
import { AdminActionForm } from "./admin-action-form";
import { AdminSubmitButton } from "./admin-submit-button";

export function CmsPageCreateForm() {
  return <AdminActionForm action={createEditorialPage} className="admin-form">
    <label>Título<input autoComplete="off" maxLength={200} name="title" required /></label>
    <label>Ruta pública<input autoComplete="off" maxLength={180} name="path" placeholder="/seccion/nueva-pagina" required /></label>
    <p className="admin-form-help">La página se crea como borrador privado. Podrás agregar bloques, imágenes y SEO antes de publicarla.</p>
    <AdminSubmitButton>Crear página</AdminSubmitButton>
  </AdminActionForm>;
}
