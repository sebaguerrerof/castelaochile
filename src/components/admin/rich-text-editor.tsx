"use client";

import Image from "@tiptap/extension-image";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Heading3, ImagePlus, Italic, Link2, List, ListOrdered, Minus, Quote } from "lucide-react";
import { useRef, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type RichTextEditorProps = { initialHtml: string; name: string; readOnly?: boolean; userId: string };

export function RichTextEditor({ initialHtml, name, readOnly = false, userId }: RichTextEditorProps) {
  const [html, setHtml] = useState(initialHtml);
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    content: initialHtml,
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true, defaultProtocol: "https" } }),
      Image.configure({ allowBase64: false, inline: false }),
    ],
    onUpdate: ({ editor: current }) => setHtml(current.getHTML()),
  });

  function setLink() {
    if (!editor) return;
    const previous = editor.getAttributes("link").href as string | undefined;
    const href = window.prompt("URL del enlace (https://…)", previous ?? "https://");
    if (href === null) return;
    if (!href.trim()) editor.chain().focus().extendMarkRange("link").unsetLink().run();
    else editor.chain().focus().extendMarkRange("link").setLink({ href: href.trim() }).run();
  }

  async function uploadImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file || !editor) return;
    if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage("Usa JPG, PNG o WebP de hasta 5 MB.");
      return;
    }
    setUploading(true);
    setMessage(null);
    const extension = file.name.split(".").pop()?.toLowerCase() || "image";
    const path = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await createBrowserSupabaseClient().storage.from("content-images").upload(path, file, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (error) setMessage("No fue posible subir la imagen del contenido.");
    else {
      editor.chain().focus().setImage({ src: `/api/public/media/content/${path}`, alt: file.name.replace(/\.[^.]+$/, "") }).run();
      setHtml(editor.getHTML());
      setMessage("Imagen insertada en el contenido.");
    }
    setUploading(false);
    event.currentTarget.value = "";
  }

  if (readOnly) return <><input name={name} type="hidden" value={html} /><div className="admin-rich-editor admin-rich-editor--readonly"><EditorContent editor={editor} /></div></>;
  const button = (label: string, active: boolean, action: () => void, icon: React.ReactNode) => <button aria-label={label} aria-pressed={active} className={active ? "is-active" : undefined} onClick={action} type="button">{icon}</button>;
  return <div className="admin-rich-editor">
    <input name={name} type="hidden" value={html} />
    <div aria-label="Formato de contenido" className="admin-rich-editor__toolbar" role="toolbar">
      {button("Negrita", editor?.isActive("bold") ?? false, () => editor?.chain().focus().toggleBold().run(), <Bold aria-hidden="true" size={17} />)}
      {button("Cursiva", editor?.isActive("italic") ?? false, () => editor?.chain().focus().toggleItalic().run(), <Italic aria-hidden="true" size={17} />)}
      {button("Título nivel 2", editor?.isActive("heading", { level: 2 }) ?? false, () => editor?.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 aria-hidden="true" size={17} />)}
      {button("Título nivel 3", editor?.isActive("heading", { level: 3 }) ?? false, () => editor?.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 aria-hidden="true" size={17} />)}
      {button("Lista con viñetas", editor?.isActive("bulletList") ?? false, () => editor?.chain().focus().toggleBulletList().run(), <List aria-hidden="true" size={17} />)}
      {button("Lista numerada", editor?.isActive("orderedList") ?? false, () => editor?.chain().focus().toggleOrderedList().run(), <ListOrdered aria-hidden="true" size={17} />)}
      {button("Cita", editor?.isActive("blockquote") ?? false, () => editor?.chain().focus().toggleBlockquote().run(), <Quote aria-hidden="true" size={17} />)}
      {button("Enlace", editor?.isActive("link") ?? false, setLink, <Link2 aria-hidden="true" size={17} />)}
      {button("Separador", false, () => editor?.chain().focus().setHorizontalRule().run(), <Minus aria-hidden="true" size={17} />)}
      <button aria-label="Insertar imagen" disabled={uploading} onClick={() => fileInput.current?.click()} type="button"><ImagePlus aria-hidden="true" size={17} /></button>
      <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={uploadImage} ref={fileInput} type="file" />
    </div>
    <EditorContent editor={editor} />
    {message && <p className="admin-form-help" role="status">{message}</p>}
  </div>;
}
