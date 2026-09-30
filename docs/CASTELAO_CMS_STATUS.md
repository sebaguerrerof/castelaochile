# Castelao Chile — estado del sprint CMS y Equipo

Fecha de cierre: 30 de septiembre de 2026 (America/Santiago).

**GO técnico.** Implementación y validación completas en el workspace. Las tres migraciones y el seed están aplicados a la base Supabase vinculada. El frontend todavía no se ha desplegado; este cierre no representa una publicación en Vercel ni un commit.

## Alcance entregado

Se extendió el administrador existente, con su mismo layout, navegación, sesión y roles. Se agregaron Páginas, Equipo y Configuración. Noticias mantiene sus rutas, editor y funciones; `/admin/noticias` es un alias que conserva los filtros.

CMS estructurado con 14 tipos de bloques, formularios visuales, Tiptap compartido, media compartida, validación Zod estricta, saneamiento de HTML, activación y orden de bloques, borrador/publicación/archivo, vista previa privada y SEO. Las rutas institucionales core son inmutables. El guardado de página y bloques es transaccional y comprueba la versión para evitar sobrescrituras concurrentes.

Cuatro tablas nuevas con RLS: `cms_pages`, `cms_page_sections`, `professionals` y `site_settings`. Registro de cambios en la auditoría existente. No se creó una segunda autenticación ni un segundo CMS de Noticias.

## Contenido migrado

| Página | Ruta |
| --- | --- |
| Inicio | `/` |
| Instituto | `/instituto` |
| Tratamiento | `/acompanamiento`, alias `/tratamiento` |
| Recovery 40 | `/recovery-40` |
| Método | `/nuestro-enfoque` |
| Familias | `/familias` |
| Equipo | `/equipo` |
| FAQ | `/preguntas-frecuentes` |
| Contacto | `/contacto` |

Estado de base al cierre: **9 páginas, 40 bloques y 1 profesional**. El contenido inicial procede del documento maestro del sprint. No existe fallback a textos institucionales provisionales en estas rutas. Se preservan $35.000 de evaluación, $550.000 mensuales sin psiquiatría y $4.500.000 referenciales por Recovery 40, con sus condiciones y advertencia clínica.

Marcelo Montiel Arzola está cargado como dato editable. `/equipo/marcelo-montiel` utiliza la plantilla genérica `/equipo/[slug]`. El admin permite crear otros profesionales, editar foto/alt, biografía, credenciales, experiencias, medios, charlas, contacto, CTA, SEO, estado, destacado y orden. No se inventaron fotografías ni profesionales adicionales.

## Validaciones realizadas

- `pnpm lint`: PASS.
- `pnpm typecheck`: PASS, también después de restaurar los archivos generados por el build de QA.
- `pnpm test`: **48/48 PASS**.
- Build de producción Next.js: **PASS**, incluyendo las rutas públicas y administrativas nuevas.
- `pnpm audit --prod`: sin vulnerabilidades conocidas.
- QA de navegador con Playwright y Chrome del runtime: **63 comprobaciones PASS**, público/admin a 1440 y 375 px. Un H1, ausencia de desbordamiento horizontal y de imágenes rotas/errores del navegador, canonical, noindex de previews, navegación móvil y FAQ.
- Pruebas funcionales reales del admin: guardar página, reordenar/desactivar bloques, crear/editar profesional, ordenar/destacar, cargar imagen y alt, crear/editar noticia con el editor existente. Todos los fixtures permanecieron en borrador y se eliminaron junto con sus archivos.
- Borradores: invisibles por consultas anónimas; perfil y foto devuelven 404; la vista previa requiere sesión autorizada. La foto del borrador sí se visualiza con staff.
- `supabase/tests/cms_rls_test.sql`: PASS en una transacción con rollback. Incluye anon, externo, viewer, editor, staff inactivo, publicación, concurrencia, guardado atómico y auditoría. La publicación se verificó mediante este ensayo transaccional; no se publicó contenido ficticio para QA.
- Asesor de seguridad Supabase: sin alertas después de las migraciones.
- `git diff --check`: PASS.

Noticias conserva **232 registros**, con el mismo fingerprint inicial `6304b09ff43f3a7cd25bcf0edcacc95e`. Se verificaron portada, artículos, búsqueda y paginación, así como creación/edición de borradores desde el admin. El cierre confirmó cero páginas, profesionales y noticias con el prefijo de pruebas `cms-qa`.

Se corrigieron problemas encontrados en QA: solapamiento de navegación desktop, contraste de CTA del hero, desbordamiento del input de subida oculto y diferencia de hidratación al mostrar fechas de Noticias entre ICU del servidor y del navegador. Las fechas usan formato determinista de Chile. Las capturas móviles esperan que termine el cierre del menú antes de registrar el resultado.

Artefactos locales de QA: `tmp/cms-qa/results.json`, `latest-checks.json` y capturas desktop/mobile; están ignorados por Git. El script reproducible es `scripts/qa-cms-browser.mjs`. No se guardan credenciales en los resultados.

## Migraciones aplicadas

1. `20260930145403_structured_institutional_cms.sql`: tablas, RLS, índices, RPC atómico, auditoría y seed idempotente.
2. `20260930153053_fix_cms_audit_resource_id.sql`: tipo UUID de recurso y metadatos de configuración en auditoría.
3. `20260930153453_harden_cms_rpc_role_guard.sql`: rechazo explícito de roles externos/null en el RPC.

Se aplicaron de forma aditiva. No se modificaron los artículos originales ni se instalaron dependencias nuevas del proyecto.

## Pendientes editoriales y operativos

- Confirmar dirección, email, teléfono adicional, redes, dominio definitivo y URL de agenda. Se conserva únicamente el WhatsApp ya confirmado; la evaluación enlaza al contacto existente.
- Incorporar fotografía autorizada de Marcelo y datos de otros profesionales cuando existan. Confirmar autorización de las imágenes institucionales preexistentes.
- Completar detalles editoriales de método, Recovery 40, medios y conferencias a partir de fuentes institucionales aprobadas. No se añadieron eventos, emisoras ni credenciales no confirmados.
- Desplegar el frontend y validar el dominio/entorno de publicación. La configuración de revisión mantiene noindex hasta su activación correspondiente.
- Conservar las condiciones previas de privacidad, proveedor y antiabuso para recepción del formulario de contacto.

## Límites y deuda técnica

- Existe una sola versión de cada página/perfil: **guardar como borrador retira la versión publicada**. El editor lo advierte. Una futura versión paralela de borrador requiere historial/versionado adicional.
- Vista previa de cambios guardados; no muestra cambios locales sin guardar.
- Quitar una imagen elimina la referencia, no el archivo físico compartido. Pendiente limpieza controlada de medios huérfanos.
- Las URLs firmadas ya emitidas pueden durar hasta 300 segundos; despublicar impide emitir otras, pero no revoca inmediatamente las anteriores.
- El contenido institucional ahora depende de Supabase. Ante una falla se muestra error; una página borrador/archivada devuelve 404. Mantener supervisión del servicio.
- El asesor de rendimiento detecta dos políticas SELECT permisivas superpuestas preexistentes en `content_posts`, además de avisos informativos de índices/conexiones. No se cambiaron las políticas antiguas del blog en este sprint.
- Pueden quedar módulos antiguos de contenido provisional sin uso; las nueve páginas migradas ya no dependen de ellos.

Detalle de operación: [CASTELAO_CMS.md](./CASTELAO_CMS.md). Auditoría de partida: [CASTELAO_CMS_AUDIT.md](./CASTELAO_CMS_AUDIT.md).

## Cierre posterior del rediseño público — 30 de septiembre de 2026

La fase posterior reemplazó la presentación pública por un sistema visual basado en el manual corporativo y la composición de la web de España. Header agrupado y menú móvil modal, páginas institucionales, Equipo, perfiles, Contacto, Blog y footer comparten el diseño. Público y preview siguen usando los mismos componentes y datos del CMS; los destinos de tarjetas ahora son editables.

Se añadieron y aplicaron `20260930172631_public_design_card_links.sql` y `20260930180600_public_contact_copy.sql`: destinos iniciales de tarjetas y dos textos originales de contacto, conservando ediciones previas y artículos. Next.js y su configuración de ESLint se actualizaron a 16.3.6 por el aviso de seguridad publicado durante el cierre.

Validación de esta fase: **53 pruebas unitarias**, **45 comprobaciones públicas** y **63 comprobaciones del CMS**, todas aprobadas; lint, tipos, build y revisión de whitespace aprobados, auditoría de producción sin vulnerabilidades conocidas. Se conservan 232 artículos y no quedan fixtures de QA. Vista previa local en `http://localhost:3300`; frontend todavía sin desplegar.

Especificación y comandos reproducibles: [PUBLIC_DESIGN_SYSTEM.md](./PUBLIC_DESIGN_SYSTEM.md). Los resultados anteriores de este documento corresponden a la fase inicial del CMS.
