import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

/** One uploader for Noticias, rich text, CMS blocks and professional photos. */
export async function uploadContentImage(file: File, userId: string) {
  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
  if (!extension || file.size > 5 * 1024 * 1024) throw new Error("Usa JPG, PNG o WebP de hasta 5 MB.");
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await createBrowserSupabaseClient().storage.from("content-images").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error("No fue posible subir la imagen. Confirma tu sesión y permisos.");
  return path;
}
