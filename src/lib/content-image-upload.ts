import { fitWithin } from "@/lib/image-fit";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const WEBP_QUALITY = 0.82;

/**
 * Downscales and recompresses a photograph in the browser before it is stored, so the public
 * pages do not ship camera-sized files. Falls back to the original when the browser cannot
 * decode it or when the result would not be smaller.
 */
async function optimizeImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = fitWithin(bitmap.width, bitmap.height);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", WEBP_QUALITY));
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

/** One uploader for Noticias, rich text, CMS blocks and professional photos. */
export async function uploadContentImage(original: File, userId: string) {
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(original.type) || original.size > 5 * 1024 * 1024) throw new Error("Usa JPG, PNG o WebP de hasta 5 MB.");
  const file = await optimizeImage(original);
  const extension = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }[file.type];
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await createBrowserSupabaseClient().storage.from("content-images").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) throw new Error("No fue posible subir la imagen. Confirma tu sesión y permisos.");
  return path;
}
