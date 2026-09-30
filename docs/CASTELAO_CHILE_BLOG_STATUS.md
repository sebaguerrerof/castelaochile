# Estado Blog Castelao Chile

Actualizado: 2026-09-30 (America/Santiago)

## Estado técnico

**NO-GO para cierre definitivo: acceptance test administrativo e indexación pendientes.** La aplicación está desplegada en https://castelaochile.vercel.app, con las tres migraciones aplicadas, 232 artículos publicados y 709 medios. `blog:verify` pasa y la última sincronización confirma 232 sin cambios y cero fallidos. La configuración global conserva el modo de revisión: `robots.txt` bloquea rastreo y el sitemap está vacío; no se activó indexación sin resolver la decisión SEO internacional.

## Realizado

- [x] Lectura completa de `CASTELAO_CHILE_BLOG_CODEX.md` y auditoría del repositorio.
- [x] Reutilización de `content_posts`, `/admin/contenidos`, Auth/RLS y `content-images`.
- [x] WordPress REST API confirmada y adoptada como fuente primaria.
- [x] Modelo extendido, categorías N:M, FTS español, constraints, índices, triggers y grants.
- [x] RLS pública para publicados vigentes y protección DB de campos sincronizados.
- [x] `npm run blog:sync` con timeout, retries, host/MIME/tamaño, hash e idempotencia.
- [x] Migración de portada e imágenes editoriales a Storage privado.
- [x] Tolerancia de medios históricos ausentes sin perder artículos.
- [x] Sanitización en importación, guardado local y render.
- [x] Listado público con búsqueda, categorías, 12 por página, estado vacío y paginación.
- [x] Skeletons de listado/detalle y error boundary nativo.
- [x] Detalle con autor, categorías, fecha, lectura, relacionados, CTA Chile y fuente original.
- [x] SEO dinámico, self-canonical, OG/Twitter, JSON-LD y sitemap.
- [x] Administrador existente ampliado según 18.1–18.11.
- [x] Listado admin con columnas, búsqueda, filtros, paginación, preview y origen.
- [x] Formulario completo con carga de datos existentes, Tiptap, portada, categorías, autor, fechas, estado y SEO.
- [x] Posts España read-only en campos fuente; estado y SEO locales editables.
- [x] Posts Chile completamente editables y fuera del alcance del importador.
- [x] Preview autenticado/noindex y protección de cambios sin guardar.
- [x] Prueba reversible: resincronización preservó estado y SEO locales.
- [x] Sync completo y segunda pasada idempotente.
- [x] QA desktop, móvil 375 px, consola/red y teclado en Chrome.
- [x] Lint, typecheck, tests, build, db lint y audit aprobados.
- [x] Compatibilidad transitoria con el schema anterior: las rutas públicas ya no caen con 500 y el administrador informa que faltan migraciones sin habilitar edición incompleta.

## Métricas del entorno enlazado

- Fuente detectada: WordPress REST API.
- Posts detectados: **232**.
- Posts importados/publicados: **232**.
- Segunda pasada: **0 creados, 0 actualizados, 232 sin cambios, 0 fallidos**.
- Categorías: **11**; con posts: **9**.
- Relaciones post-categoría: **268**; posts sin categoría: **0**.
- Imágenes fuente detectadas inicialmente: **591 URLs únicas**.
- Objetos de media referenciados y presentes en Storage: **709 / 709**.
- Posts sin portada: **8** (incluye posts sin imagen fuente y portadas históricas no disponibles).
- Advertencias de media: **8 referencias 404 en 6 posts**.
- HTML inseguro detectado después de importar: **0**.
- Imágenes remotas del origen restantes en HTML: **0**.
- Promociones de contacto españolas restantes: **0**.
- IDs fuente duplicados: **0**; slugs duplicados: **0**.
- Búsqueda `alcohol`: **186 resultados**; páginas 1 y 2 con 12 resultados.
- Post más antiguo: `tipos-de-terapias-en-tratamiento-de-adicciones` (2018-10-08).
- Post más reciente en la fuente al sincronizar: `vuelta-a-la-rutina-y-consumo-de-alcohol` (2026-09-23).

### Categorías

| Categoría | Posts |
|---|---:|
| Actualidad | 7 |
| Adicción=Enfermedad | 85 |
| Alcohol | 26 |
| Cannabis | 13 |
| Cocaína | 21 |
| Drogas | 8 |
| Otras drogas | 59 |
| Testimonios | 8 |
| Tratamientos | 41 |
| Sin categoría | 0 |
| Uncategorized | 0 |

Un post puede pertenecer a más de una categoría.

## Validaciones

- `npm run lint`: PASS.
- `npm run typecheck`: PASS.
- `npm test`: PASS, 39/39.
- `npm run build`: PASS con Next.js 16.3.5.
- `pnpm audit --prod`: PASS, 0 vulnerabilidades conocidas.
- `supabase db lint` en preview: PASS, 0 errores.
- Verificación RLS REST: PASS 6/6 y datos temporales limpiados.
- `npm run blog:verify`: PASS.
- `npm run blog:verify-preservation`: PASS y rollback del override de prueba.
- Chrome QA: PASS en `/blog`, `?pagina=2`, `?q=alcohol`, búsqueda+página 2, post antiguo, post sin portada, desktop, móvil y teclado; 0 errores de consola/red/imágenes.
- Schema enlazado anterior: PASS HTTP 200 en `/`, `/blog`, `/blog?pagina=2`, `/blog?q=alcohol` y `/noticias`; la repetición posterior no añadió errores al log de Next.
- pgTAP: no ejecutado por ausencia de Docker/Podman en el host; suite creada en `supabase/tests/blog_rls_test.sql`.

## Última sincronización

- Entorno: proyecto Supabase enlazado configurado en `.env.local`.
- Fecha local: 2026-09-29.
- Primera carga enlazada: 232 filas; 231 completadas y un fallo transitorio HTTP 520 al adjuntar categorías. La siguiente pasada reparó la relación sin duplicar posts.
- Cinco subidas transitorias de media fueron recuperadas mediante reintento acotado; resultado final 709/709 objetos y referencias presentes.
- Pasada final de idempotencia: 232 procesados; 0 creados; 0 actualizados; 232 sin cambios; 0 fallidos; 0 medios reescritos.

## Pendiente operativo

- [x] Aplicar las migraciones `20260929195908`, `20260929201437` y `20260929204854` en el proyecto enlazado.
- [x] Ejecutar la carga inicial, recuperación de medios y `blog:verify` en el entorno enlazado.
- [x] Desplegar la aplicación Next.js en producción (Vercel, commit `5cb51d4`, rama `feature/admin-supabase-cms`).
- [ ] Acceptance test del administrador con una cuenta editorial real del entorno destino.
- [ ] Ejecutar pgTAP en CI o en un host con Docker/Podman.
- [ ] Revisión SEO internacional de canonical/hreflang (`SEO_DECISION_REQUIRED`).
- [ ] Confirmar URL definitiva y habilitar `NEXT_PUBLIC_SITE_MODE=production` cuando se apruebe la indexación; redeploy y contrastar los 232 artículos del sitemap.
- [ ] Incorporar favicon institucional aprobado: `/favicon.ico` devuelve 404.

## Deuda técnica

- No existe CRUD completo de categorías; el MVP reutiliza el catálogo y selección múltiple.
- No existe acción explícita “Desvincular de España”; queda contemplada para una fase futura.
- La sincronización es manual y mantenible, pero todavía no existe scheduler/monitor automático.
- La primera migración de 709 medios es conservadora y lenta; debe ejecutarse con timeout amplio.
- El comando usa el soporte experimental de type stripping de Node 22 y emite su advertencia informativa.
- Los fallos transitorios de media que dejan un hash fuente estable pueden requerir recuperación acotada; mejorar el reintento persistente sin alterar contenido local.

## Riesgos y decisiones

- Ocho referencias históricas de imagen no existen en la fuente; los artículos se preservan y muestran fallback.
- WordPress puede cambiar API, markup o archivos; el sync nunca debe migrarse al request público.
- La estrategia internacional de contenido duplicado necesita decisión SEO humana.
- Las referencias editoriales a España se conservaron intencionalmente para no alterar contexto clínico.
- La rama preview contiene el dataset de validación; no debe confundirse con producción.

## Errores conocidos

- Los incidentes de schema descritos abajo son históricos y están resueltos tras aplicar las tres migraciones. La verificación enlazada confirma 232 publicados, 268 relaciones, cero posts sin categoría, cero duplicados y cero HTML inseguro.
- Navegación actualizada: Blog reemplaza a Instituto en header, menú móvil y footer; `/instituto` conserva su ruta. Se retiró la barra secundaria duplicada y se incorporó el autor en las tarjetas.
- QA local enlazado: HTTP 200 con contenido en listado, página 2, búsqueda, búsqueda+página 2, post antiguo y post sin portada; captura desktop 1440 px y compacta 500 px verificadas. El QA autenticado del administrador sigue pendiente.

- Incidente 2026-09-29: las tres migraciones del blog aún no están aplicadas en el proyecto enlazado. Confirmado con Postgres `42703` (`content_posts.reading_time_minutes` no existe), PostgREST `PGRST205` (`public.blog_categories` no existe), `PGRST202` (`search_blog_posts` no existe) y `supabase migration list --linked`.
- Mitigación 2026-09-29: el frontend público reintenta exclusivamente con columnas heredadas ante esos errores esperados; `/blog` queda vacío en ese estado. El listado admin usa el mismo modo compatible, oculta la creación y muestra un aviso operativo. Otros errores de base de datos continúan propagándose.
- El error global `Could not load published content` está corregido en código y ya no se reprodujo después de recorrer las rutas locales afectadas.
- La rama preview validada no presenta este error.
- Limitación de entorno: `supabase test db` no puede iniciar pgTAP sin Docker/Podman.
- Advertencias de contenido: 8 medios fuente con HTTP 404, registradas y degradadas sin fallar posts.

## Despliegue y verificación de producción (2026-09-30)

- Push realizado a `origin/feature/admin-supabase-cms`; implementación `5cb51d4`.
- Vercel build y despliegue aprobados: https://castelaochile.vercel.app.
- Navegador: 232 artículos, búsqueda alcohol con 186 resultados, páginas 1/2 y búsqueda+página 2 con 12 tarjetas, artículo de 2018 y artículo sin portada correctos.
- Desktop 1440 px y móvil emulado 375 px sin overflow horizontal ni imágenes rotas; Tab recorre enlace de salto, navegación, buscador y filtros.
- QA con caché: PASS, cero errores de consola y red. QA repetido con perfil limpio: FAIL exclusivamente por `https://castelaochile.vercel.app/favicon.ico` (404); listado, búsquedas, artículos, imágenes y viewports cumplen las comprobaciones. No se considera resuelto por desaparecer con caché.
- `/admin/contenidos` sin sesión redirige correctamente a `/admin/login`. La creación/edición con una cuenta editorial real aún no fue validada en este despliegue.
- `/` y `/sitemap.xml` responden 200. El sitemap vacío y `Disallow: /` son consecuencia del modo de revisión existente, no una validación SEO aprobada para indexación.

## Rediseño de página individual (2026-09-30)

- [x] Hero con portada principal y título superpuesto; fallback institucional para artículos sin imagen.
- [x] Corregido el ancho exterior limitado/descentrado; columna editorial centrada de 68ch.
- [x] Bajada, autor, fecha y lectura separados; mejores párrafos, listas, citas, headings, tablas e imágenes.
- [x] Hero/introducción reutilizados en Blog y Noticias; skeleton actualizado; contenido y datos intactos.
- [x] Hero eager/high; tarjetas lazy; API privada de imágenes sin cambios.
- [x] Capturas locales verificadas de artículo antiguo y reciente con título largo, desktop 1440 y móvil 375; sin overflow ni imágenes rotas. QA caliente PASS; el único fallo frío sigue siendo el favicon previamente registrado.
- [x] Lint/typecheck/build PASS; tests 40/40 PASS.
- [x] Publicar y contrastar el nuevo diseño en producción: commit `8cfb26a`, https://castelaochile.vercel.app. HTTP 200 en artículo antiguo, reciente y sin portada; capturas de hero/cuerpo comprobadas en 1440px/375px. El QA frío sigue fallando exclusivamente por el favicon ya registrado.
- [x] Segunda pasada de producción: QA PASS en 11 recorridos, sin errores de consola/red ni imágenes rotas; no borra el pendiente del favicon observado sin caché.
- Pendientes anteriores de aceptación admin, indexación, favicon y pgTAP se conservan; esta mejora visual no los da por resueltos.
