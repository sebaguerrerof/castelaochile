# Auditoría CMS — 30-09-2026

## Estructura actual
Next.js 16.3.5, React 19.3.0, TypeScript, Zod 4.6.5. Rutas públicas en `src/app/(public)`. Inicio e institucionales usan contenido provisional en `src/content` y JSX. Se conservan `/instituto`, `/acompanamiento`, `/nuestro-enfoque`, `/familias`, `/preguntas-frecuentes`, `/contacto`. Se agregan `/tratamiento`, `/recovery-40`, `/equipo` y perfiles dinámicos.

## Admin y autenticación
Un único layout protegido en `/admin/(secured)` con `AdminShell`. Autenticación SSR existente: `requireAdmin`, roles activos en `admin_users`; superadmin/editor editan, viewer lee. Noticias vive realmente en `/admin/contenidos`; preservar esta ruta y agregar alias `/admin/noticias`.

## Base de datos auditada
Proyecto vinculado `rybcqiuklmoxhcostmlf`. Ocho tablas públicas, todas con RLS: admin_users, contact_submissions, contact_notes, content_posts (232 registros), admin_audit_log, analytics_daily, blog_categories, blog_post_categories. No hay tablas equivalentes a CMS de páginas ni profesionales. Las funciones privadas de permisos existentes se reutilizan.

## Reutilización
RichTextEditor (Tiptap), SafeHtml y sanitizeBlogHtml; bucket privado content-images, uploader JPG/PNG/WebP hasta 5 MB; AdminActionForm, AdminSubmitButton, PageHeader, AdminPanel, StatusBadge y skeletons. Extraer uploader compartido para Noticias y CMS. PageHero, Section, accordion, botones y tipografía institucionales. ContactForm y su API conservan lógica funcional.

## Cambios propuestos
Páginas y secciones tipadas Zod, profesionales genéricos, configuración global. Guardado transaccional de páginas con control de concurrencia; lectura pública estrictamente publicada, preview autenticada/noindex. Seed idempotente con contenido del documento maestro; conservar WhatsApp actual y datos nulos sin inventar fotografías, domicilio ni correo. Metadata y sitemap derivados de contenido publicado.

## Riesgos
Migración requiere validar RLS y aislamiento de media de borradores. No sobrescribir noticias ni datos productivos. El nuevo contenido editorial reemplaza textos provisionales; conservar rutas para SEO. Credenciales y recuperación de Marcelo provienen exclusivamente del documento entregado; foto pendiente. QA autenticada y responsive obligatoria antes de GO.

## Guías consultadas
Guías instaladas Next.js: use-server, revalidatePath, fetching-data. Guía Supabase y documentación oficial RLS. El sandbox de comandos falla al iniciar; ejecución ampliada autorizada por revisión automática para el trabajo local.
