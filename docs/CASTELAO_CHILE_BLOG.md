# Blog de Instituto Castelao Chile

Documento operativo de la integración editorial entre el WordPress de Instituto Castelao y el CMS existente de Castelao Chile. La implementación reutiliza `content_posts`, `/admin/contenidos`, Supabase Auth, RLS y el bucket privado `content-images`; no existe un segundo CMS.

## Arquitectura

```text
WordPress REST API (ejecución manual/server-side)
  -> scripts/blog-sync.ts
  -> normalización + sanitize-html + hash SHA-256
  -> content_posts + blog_categories + blog_post_categories
  -> content-images/wordpress/{source_post_id}/{hash}

Navegación pública
  -> Next.js Server Components
  -> search_blog_posts (PostgreSQL FTS en español + unaccent)
  -> RLS: sólo published con published_at <= now()
  -> /blog y /blog/[slug]

Administración autenticada
  -> /admin/contenidos existente
  -> edición completa de contenido Chile
  -> lectura de campos fuente + overrides de estado/SEO para contenido España
```

El sitio público nunca consulta WordPress durante una visita. Una interrupción de la fuente española no afecta el contenido ya sincronizado.

## Fuente editorial y fallback

La fuente primaria comprobada es:

```text
https://www.institutocastelao.com/wp-json/wp/v2/posts
https://www.institutocastelao.com/wp-json/wp/v2/categories
```

Se usa `_embed=1`, paginación REST e IDs estables. El fallback documentado, todavía innecesario, consiste en descubrir URLs mediante sitemap, descargar cada artículo server-side y extraer exclusivamente el contenido editorial con los mismos límites, sanitización e idempotencia. Nunca debe implementarse scraping durante requests públicos.

## Modelo de datos

`content_posts` conserva compatibilidad con noticias/blog locales y añade:

- HTML sanitizado y texto plano para búsqueda;
- autor, tiempo de lectura e imagen fuente;
- `origin`: `castelao_es` o `castelao_cl`;
- `source_post_id`, URL, fecha de modificación, hash y fecha de sync;
- título y descripción SEO;
- vector FTS mantenido por trigger.

Las categorías se normalizan en `blog_categories` y la relación múltiple en `blog_post_categories`. Existe unicidad por `(origin, source_post_id)`, unicidad global de slug e índices para publicación, origen, fuente y búsqueda.

## Política de origen y edición

### Publicaciones sincronizadas (`castelao_es`)

Campos administrados por la fuente y bloqueados en UI y base de datos para usuarios autenticados:

- título, slug, extracto y contenido;
- autor y categorías;
- imagen destacada;
- fecha editorial y metadata de sincronización.

Overrides locales permitidos y preservados por cada sync:

- estado (`draft`, `published`, `archived`);
- SEO title;
- meta description.

No se permite eliminar una publicación España desde el administrador. Para ocultarla en Chile se archiva. Una opción futura de “desvincular” deberá convertir explícitamente el registro a `castelao_cl`; no se implementó en este MVP.

### Publicaciones locales (`castelao_cl`)

Son completamente editables. El importador nunca las selecciona ni modifica, incluso ante una colisión de slug. La creación manual asigna el origen Chile server-side y el trigger impide fingir origen España.

## Sincronización

Variables server-side requeridas:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SECRET_KEY=
CASTELAO_SOURCE_BASE_URL=https://www.institutocastelao.com
```

Nunca exponga `SUPABASE_SECRET_KEY` al navegador, logs o documentación.

Comandos:

```bash
npm run blog:sync -- --dry-run
npm run blog:sync
npm run blog:sync -- --limit=3
npm run blog:verify
```

El sync:

1. descarga categorías y posts publicados desde WordPress REST;
2. normaliza fechas, slugs, autores y categorías;
3. elimina shortcodes heredados y sanitiza HTML;
4. descarga medios permitidos, valida host, MIME y máximo de 5 MB;
5. almacena medios con rutas deterministas en Storage;
6. calcula un hash estable de los campos fuente;
7. crea, actualiza o deja sin cambios por `origin + source_post_id`;
8. reemplaza relaciones de categorías sólo cuando corresponde;
9. emite un resumen y exit code distinto de cero ante fallos editoriales.

Un medio histórico ausente no elimina el artículo: se omite esa imagen, se registra una advertencia y se usa el estado nativo sin imagen. El hash fuente queda estable, por lo que el siguiente sync sigue siendo idempotente. Si un proceso se interrumpe, puede ejecutarse nuevamente; cada post ya completado será reconocido.

La primera carga de cientos de medios es deliberadamente conservadora y puede tardar horas. Ejecútela desde un entorno con timeout suficiente. Las pasadas posteriores sin cambios tardan aproximadamente un minuto para el volumen actual.

## Medios

- Bucket existente: `content-images` (privado).
- Portadas: `/api/public/media/{kind}/{slug}` valida visibilidad por RLS y genera una URL firmada corta.
- Imágenes internas: `/api/public/media/content/{path}` autoriza que el medio esté referenciado por contenido visible y genera URL firmada.
- `next/image` se usa sin optimización para la portada firmada porque el optimizador de Next 16 rechaza la respuesta interna redirigida; el navegador consume el JPEG/PNG/WebP firmado directamente.
- El HTML público no conserva URLs de imágenes de `institutocastelao.com`.

## Búsqueda y paginación

`search_blog_posts` usa Full Text Search en español, `unaccent`, ranking y seguridad invoker. Busca en título, extracto, autor y texto editorial. Categorías y búsqueda se combinan server-side.

- 12 posts por página;
- URL compartible (`q`, `categoria`, `pagina`);
- total calculado en la misma consulta;
- filtros preservados al paginar;
- queries con búsqueda se marcan `noindex,follow`;
- páginas fuera de rango redirigen a la última válida.

## Administrador

El módulo existente `/admin/contenidos` incluye:

- listado paginado, búsqueda y filtros por tipo, estado, origen y categoría;
- imagen, título/slug, categorías, autor, estado, origen, fechas, sync y acciones;
- creación y edición de título, slug, extracto, autor, múltiples categorías, estado, fecha, portada/alt, contenido y SEO;
- editor Tiptap compatible con React 19/SSR: H2/H3, negrita, cursiva, listas, links, blockquote, separador e imágenes;
- preview de portada, reemplazo/eliminación y subida al bucket existente;
- preview autenticado y `noindex`, incluso para drafts;
- datos de sistema y origen en modo read-only;
- prevención de doble submit, estado “Guardando…”, conservación de valores ante errores y advertencia por cambios sin guardar;
- cálculo automático del tiempo de lectura.

No se añadió un CRUD completo de categorías: el catálogo sincronizado se reutiliza y la selección múltiple funciona para contenido Chile.

## Seguridad

- `sanitize-html` se aplica al importar, al guardar contenido local y nuevamente antes de renderizar.
- Se eliminan scripts, estilos, formularios, iframes, event handlers, URLs inseguras y shortcodes.
- Los links externos reciben atributos seguros.
- No se importan header, footer, chat, cookies, widgets, comentarios ni scripts del origen.
- La promoción de contacto española detectada se elimina sin reemplazar referencias editoriales legítimas a España.
- RLS excluye drafts, archivados y publicaciones futuras.
- Un trigger de base de datos protege campos sincronizados aun si se evita la UI.
- Las rutas de media validan slug/path y visibilidad antes de firmar.

## SEO

- metadata dinámica por post;
- fallback `seo_title ?? title` y `seo_description ?? summary`;
- Open Graph y Twitter Card;
- self-canonical de Castelao Chile;
- JSON-LD `Article`;
- fechas, autor, categoría e imagen cuando existe;
- posts publicados incluidos en sitemap.

`SEO_DECISION_REQUIRED`: el contenido editorial España/Chile puede considerarse duplicado internacional. El comportamiento inicial es self-canonical Chile y sin `hreflang` unilateral. Marketing/SEO debe confirmar la estrategia internacional antes de agregar reciprocidad o canonicals hacia España.

## Publicación y fechas futuras

No hay un cron editorial. Un registro `published` sólo es visible cuando `published_at <= now()`, aplicado tanto por consulta como por RLS. Por ello una fecha futura se hace visible por condición temporal sin un job que cambie el estado. Drafts y archivados nunca son públicos.

## Validación y operación

```bash
npm run lint
npm run typecheck
npm test
npm run build
pnpm audit --prod
```

Validaciones adicionales en una rama de preview:

```bash
npm run blog:verify
BLOG_SYNC_TEST_ALLOW=preview npm run blog:verify-preservation
BLOG_RLS_TEST_ALLOW=preview node --env-file-if-exists=.env.local --experimental-strip-types scripts/verify-blog-rls.ts
```

`scripts/qa-blog-browser.ts` ejecuta el recorrido de navegador contra un Chrome iniciado con DevTools Protocol; requiere `CHROME_DEBUG_PORT` y `BLOG_QA_BASE_URL`.

La prueba pgTAP está en `supabase/tests/blog_rls_test.sql`. `supabase test db` requiere Docker/Podman local; si no está disponible, usar `supabase db lint` más `verify-blog-rls.ts` y ejecutar pgTAP posteriormente en CI.

## Orden de despliegue recomendado

1. respaldar/verificar el proyecto destino;
2. aplicar las tres migraciones de blog;
3. ejecutar `supabase db lint` y la verificación RLS;
4. ejecutar `npm run blog:sync` en un entorno server-side con timeout amplio;
5. ejecutar `npm run blog:verify` y contrastar conteos;
6. desplegar Next.js con las nuevas variables/dependencias;
7. revisar `/blog`, un post antiguo, uno sin portada y el administrador autenticado;
8. repetir `npm run blog:sync` y confirmar `created: 0`, `updated: 0`, `unchanged: N`, `failed: 0`.

## Troubleshooting

Estado operativo 2026-09-30: las tres migraciones y la carga completa ya están aplicadas al proyecto enlazado y la aplicación está desplegada en https://castelaochile.vercel.app. Hay 232 posts publicados, 11 categorías, 268 relaciones y 709 medios presentes. La pasada final de sincronización obtuvo 0 creados, 0 actualizados, 232 sin cambios y 0 fallidos. El QA público confirma contenido y responsive; el perfil limpio detecta únicamente el favicon ausente. La aceptación del administrador autenticado y la decisión de indexación siguen pendientes en `CASTELAO_CHILE_BLOG_STATUS.md`.

La configuración global mantiene el modo de revisión: `NEXT_PUBLIC_SITE_MODE` debe aprobarse y establecerse en `production` junto con la URL definitiva antes de habilitar indexación. Mientras tanto, `robots.txt` usa `Disallow: /` y el sitemap es deliberadamente vacío. Tras ese cambio, redeploy y verificar que el sitemap incluya los 232 artículos; no confundir despliegue público con aprobación SEO.

- **Media warning 404**: el artículo queda disponible sin la imagen afectada. Registrar la URL/ID y solicitar el asset si debe recuperarse.
- **Portada rota mediante `/_next/image`**: confirmar que `PublishedCover` conserva `unoptimized`; las URLs firmadas internas no deben pasar por el optimizador de Next 16.
- **Un post vuelve a actualizarse**: comparar `source_hash`, categorías y fecha de modificación; nunca corregirlo sobrescribiendo estado/SEO local.
- **No aparecen drafts**: comportamiento esperado de RLS. Usar la preview autenticada.
- **Error de permisos service role**: verificar que las migraciones de grants fueron aplicadas; no convertir la tabla en pública.
- **Sync interrumpido**: volver a ejecutar. Las rutas/hash deterministas y el upsert acotado evitan duplicados.
- **Cambio o caída de WordPress REST**: no afectar el frontend; evaluar el fallback sitemap/HTML documentado antes de modificar la fuente.

El estado cuantitativo y los pendientes vivos se mantienen en `docs/CASTELAO_CHILE_BLOG_STATUS.md`.
