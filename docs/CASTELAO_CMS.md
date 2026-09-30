# Castelao Chile — CMS institucional

## Arquitectura
Extensión del admin existente, sin otro layout, sidebar, autenticación ni cliente Supabase. Las páginas públicas son Server Components y consultan `cms_pages` + `cms_page_sections`; cada bloque se valida con Zod antes de guardar y antes de renderizar. Un bloque inválido se omite sin romper el resto. Noticias conserva `/admin/contenidos`; `/admin/noticias` redirige manteniendo filtros.

`src/lib/cms/schemas.ts` define Hero, Rich Text, Texto + imagen, Cards, Principios, Pasos, Métricas, Precios, CTA, Warning, FAQ, Equipo, Galería y Contacto. `src/components/cms/cms-page.tsx` resuelve exhaustivamente cada tipo con el design system existente. No hay editor JSON, HTML libre ni scripts. Tiptap y SafeHtml son los mismos de Noticias; su HTML estructural se sanea en el servidor y de nuevo al renderizar.

## Páginas
Entrar a Admin → Páginas → Editar. Información general, navegación, bloques y SEO. Los bloques se colapsan, se ordenan con Subir/Bajar y se activan/desactivan. Se pueden agregar tipos del registry. La página debe conservar un único Hero activo al inicio. Las rutas core son inmutables en el formulario y en el RPC.

Guardar cambios conserva el estado elegido. Guardar borrador retira una página publicada de la web; no hay dos versiones simultáneas publicadas/borrador. Publicar hace visible el contenido guardado. Archivar lo oculta. Vista previa muestra los cambios **guardados**, requiere staff activo y tiene noindex. Guardar antes de abrirla. Se comprueba `updated_at` para evitar sobrescribir cambios concurrentes. El RPC `save_cms_page` bloquea el registro y guarda página + bloques en una sola transacción; ante errores todo se revierte. Cambios de rutas/estados/SEO invalidan layout público y sitemap.

## Equipo
Admin → Equipo → Nuevo profesional. Nombre, slug, rol, credenciales, biografía y experiencias con Tiptap, foto/alt, medios, conferencias, frase, redes/contacto, CTA, SEO, destacado, estado y orden numérico. Orden ascendente; en empate se ordena por nombre. Borradores y archivados se excluyen de `/equipo`, `/equipo/[slug]`, Inicio y sitemap. Los destacados aparecen en el bloque de Inicio. Slug único en PostgreSQL. No existe componente específico para Marcelo.

## Media
Un solo helper `uploadContentImage` para Noticias, rich text, bloques y profesionales; bucket privado existente `content-images`, carpeta de usuario, JPG/PNG/WebP hasta 5 MB. Cargar, reemplazar, previsualizar, seleccionar imágenes del sitio o de la biblioteca propia y quitar referencias. El alt se edita en el bloque/perfil. Quitar una referencia no borra físicamente un archivo que podría ser reutilizado. Las imágenes huérfanas requieren limpieza controlada futura.

El endpoint público existente se amplía para comprobar referencias a contenido CMS publicado, secciones activas y profesionales publicados. El servidor firma la URL solo después de validar acceso. Las previews staff conservan acceso a media privada. No se expone service role al navegador. Una URL firmada ya emitida dura hasta 300 segundos; no es posible revocarla inmediatamente al despublicar, pero el endpoint deja de emitir nuevas URLs.

## Configuración
Admin → Configuración. Un único registro `site_settings/global` contiene WhatsApp, teléfono, email, dirección, redes y destino/texto de evaluación, reutilizado por header/footer, Contacto, CTA y botón flotante. La URL de evaluación inicial apunta al contacto existente hasta confirmar una agenda. No cambiar datos nulos por placeholders. El único canal preexistente confirmado se conserva: WhatsApp +56938650977. La activación de recepción de formularios conserva todas las condiciones de privacidad, proveedor y antiabuso del módulo anterior.

## Rutas y contenido inicial
| Página | Ruta pública |
| --- | --- |
| Inicio | `/` |
| El Instituto | `/instituto` |
| Tratamiento | `/acompanamiento` (canonical existente) y `/tratamiento` |
| Recovery 40 | `/recovery-40` |
| Nuestro método | `/nuestro-enfoque` |
| Familias | `/familias` |
| Equipo | `/equipo` |
| FAQ | `/preguntas-frecuentes` |
| Contacto | `/contacto` |

Seed inicial: nueve páginas, cuarenta bloques y Marcelo Montiel Arzola. Contenido fuente: documento maestro del sprint; valores $35.000 evaluación, $550.000 programa ambulatorio mensual y $4.500.000 referenciales por 40 días. Psiquiatría excluida de mensualidad; Recovery 40 no es hospitalización/desintoxicación médica. La fotografía de Marcelo queda vacía hasta recibir autorización. Solo se conservan fotos institucionales que ya existían; su aprobación sigue siendo responsabilidad institucional.

El seed es idempotente y no sobrescribe registros existentes. `scripts/cms-seed.ts` valida contenido y genera SQL sobre una migración creada con `supabase migration new`; nunca se importa desde el renderer público. El registro inicial debe aplicarse junto con las dos correcciones de auditoría/permisos del mismo sprint.

## Seguridad y operación
RLS en las cuatro tablas nuevas. Anon/usuarios externos solo leen páginas y profesionales publicados y bloques activos de páginas publicadas. Staff activo puede previsualizar; viewer no escribe. Editor y superadmin editan. Se reutilizan helpers privados y `requireAdmin`. Core pages no tienen política de borrado para authenticated. Auditoría de páginas/profesionales/configuración en `admin_audit_log`. Configuración es pública y no debe contener secretos.

No hay fallback institucional hardcodeado: si la página está en borrador/archivo devuelve 404; una falla de base de datos muestra error y no reutiliza textos provisionales. Memoización React por request evita consultas repetidas sin mezclar sesiones. Revalidación después de guardar. Mantener health checks de Supabase porque ahora el contenido institucional depende de la base.

## Validación reproducible
### Fotografías del equipo

En `/admin/equipo`, cada profesional editable tiene la acción **Subir foto**, que abre su ficha en `#fotografia`. El bloque de fotografía aparece al comienzo: **Subir imagen** abre el selector de archivos; **Cambiar imagen** permite reemplazarla y **Quitar imagen del contenido** elimina la referencia al guardar. Acepta JPG, PNG y WebP de hasta 5 MB; se recomienda un retrato vertical con el rostro centrado.

La vista previa se carga después de subir y la nueva imagen queda inmediatamente en la biblioteca del usuario. Al elegir foto se sugiere un texto alternativo con el nombre del profesional, que se puede editar. El guardado queda deshabilitado durante la carga. Después hay que pulsar **Guardar cambios**: un profesional publicado actualiza Equipo y su perfil público; un borrador mantiene fotografía y perfil privados. Quitar o reemplazar la referencia no borra físicamente un archivo que pudiera estar compartido.

Validación del ajuste: selector nativo de archivos, rechazo de formato inválido, bloqueo de guardado durante la carga, preview, biblioteca, persistencia y reapertura, privacidad del borrador, layout desktop/móvil y eliminación guardada. Cinco grupos de comprobaciones aprobados en `tmp/team-photo-results.json`, con un profesional temporal eliminado al terminar; Marcelo no se modificó. Lint, tipos, build y las 53 pruebas existentes aprobados.

### Comandos

`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm audit --prod`.

`supabase/tests/cms_rls_test.sql` prueba la base vinculada con fixtures y rollback. `scripts/qa-cms-browser.mjs` prueba desktop/mobile, público/admin, previews y guardados de borradores mediante Playwright existente en el runtime (sin dependencia nueva del proyecto). Requiere URL/key pública y secret server-side desde `.env.local`; genera una sesión local de QA del superadmin existente sin enviar correos ni cambiar contraseña y cierra solo esa sesión. Nunca imprime credenciales. Fixtures y archivos se limpian al terminar. Artefactos en `tmp/cms-qa`, ignorados por Git. Ver estado y resultados actuales en `CASTELAO_CMS_STATUS.md`.

## Límites editoriales actuales
Pendientes de confirmar: dirección, email, dominio, fotografías autorizadas, profesionales adicionales y sistema definitivo de agenda. El documento maestro contiene resúmenes para Recovery 40, método y experiencia de Marcelo; se migran sin inventar más detalle clínico, eventos, emisoras ni credenciales. El equipo puede completarlos desde el CMS.
