# Auditoría inicial del Blog de Castelao Chile

Fecha: 2026-09-29
Documento rector: `CASTELAO_CHILE_BLOG_CODEX.md`

## Resumen ejecutivo

El repositorio ya contiene un CMS editorial y rutas públicas para `blog` y `news`. La implementación debe ampliar esa infraestructura; no corresponde crear tablas de publicaciones ni un administrador paralelos.

La REST API de WordPress de `https://www.institutocastelao.com` está disponible y es viable como fuente primaria. El 29 de septiembre de 2026 respondió `200` en `/wp-json/wp/v2/posts`, informó 232 publicaciones y expuso `_embedded`, IDs estables, fechas, autores, categorías y medios. El fallback por sitemap/HTML se conservará documentado, pero no será el camino normal.

## Inventario existente

### Público

- `/blog` y `/noticias` ya existen como Server Components.
- `/blog/[slug]` y `/noticias/[slug]` ya resuelven detalle y metadata básica.
- `content-repository.ts` consulta únicamente registros publicados mediante RLS.
- La paginación actual es por cursor y no cumple el contrato `?pagina=N`.
- No existe búsqueda pública ni filtro por categoría.
- El cuerpo local se representa con un subconjunto seguro de Markdown.
- Las portadas privadas se entregan mediante un Route Handler que crea una URL firmada de corta duración.
- El sitemap ya incorpora contenido publicado.

### Administrador

- El CMS existente vive en `/admin/contenidos` y usa `content_posts`.
- Roles existentes: `superadmin`, `editor`, `viewer`.
- El listado soporta búsqueda básica, tipo y estado, pero está limitado a 25 resultados sin controles de página.
- El formulario actual contiene tipo, estado, título, slug, resumen, Markdown, portada y alt.
- Faltan autor editorial, categorías, HTML enriquecido, fecha editable, origen, datos de sincronización, SEO y preview de imagen.
- La edición carga la fila completa, pero la acción de guardado solamente persiste el modelo mínimo y reemplaza siempre `published_at` al publicar.
- La carga de portada ya reutiliza Supabase Storage y limita JPG/PNG/WebP a 5 MB.
- Existe preview privado, auditoría administrativa y estados de loading del listado.
- No existe advertencia de cambios sin guardar.

### Datos y Supabase

- Tabla reutilizable: `public.content_posts`.
- Estado enlazado antes de esta implementación: 0 publicaciones.
- No existe una taxonomía de categorías implementada.
- `content_posts` tiene RLS; la lectura anónima está limitada a `status = 'published'` y el personal activo dispone de políticas administrativas.
- Bucket privado reutilizable: `content-images`.
- El cliente de servicio está aislado en módulos server-only y usa `SUPABASE_SECRET_KEY`.
- PostgreSQL 17 está configurado en `supabase/config.toml`.

### Design system y navegación

- Tokens institucionales existentes: azul `#0079be`, naranja `#da8a1b`, grises y tonos derivados.
- Tipografías institucionales: PT Sans para títulos, Arial para texto/navegación y Volkhov/Droid Serif para recursos editoriales.
- Existen componentes y patrones de botones, paneles, badges, tablas, skeletons, foco visible, reducción de movimiento, header y footer.
- El blog reutilizará estos recursos y no copiará la interfaz de WordPress España.

### SEO, seguridad y pruebas

- Existe metadata por artículo, canonical, Open Graph y sitemap dinámico.
- Faltan JSON-LD `Article`, categorías, imagen social completa y fallbacks SEO persistidos.
- CSP de producción no permite `unsafe-eval`; desarrollo sí lo permite para diagnósticos React.
- El renderer Markdown no interpreta HTML, pero todavía no existe un pipeline mantenido para sanitizar HTML importado.
- El proyecto usa Node Test Runner. No existen todavía pruebas específicas de importación, idempotencia, búsqueda, paginación, sanitización ni routing del blog.

## Reutilización y cambios previstos

### Se reutiliza

- `content_posts`, las políticas de roles y el sistema de auditoría.
- `/admin/contenidos`, sus acciones, paneles, badges, tablas y formularios.
- las rutas `/blog` y `/blog/[slug]`;
- los clientes Supabase server/browser/admin;
- Storage y el patrón de entrega de medios privados;
- los tokens, tipografías, navegación, CTA Chile, metadata y sitemap actuales.

### Se amplía

- `content_posts` con origen, campos fuente, HTML/texto, autor editorial, lectura, SEO y sincronización;
- categorías y relación muchos-a-muchos;
- índice FTS en español con normalización de acentos;
- repositorios públicos y administrativos con búsqueda y paginación server-side;
- renderer seguro, JSON-LD, relacionados y estados sin imagen;
- editor administrativo moderno compatible con React 19/Next.js 16;
- media importada y sus rutas seguras;
- pruebas y documentación operacional.

## Migraciones necesarias

1. Ampliar `content_posts` sin eliminar columnas existentes.
2. Permitir que `author_id` sea nulo para contenido importado y agregar `author_name`.
3. Crear `blog_categories` y `blog_post_categories`.
4. Agregar constraints e índices para `origin + source_post_id`, publicación y búsqueda.
5. Crear y mantener `search_vector` mediante trigger seguro e índice GIN.
6. Conservar RLS pública solo para publicados y extender políticas administrativas a categorías.
7. Extender el bucket privado existente para medios importados; no exponer borradores ni secretos.
8. Conceder explícitamente acceso Data API solo donde corresponda, anticipando el cambio de Supabase de 2026.

## Decisión de fuente

Fuente primaria: WordPress REST API.

- Posts: `/wp-json/wp/v2/posts`
- Categorías: `/wp-json/wp/v2/categories`
- Medios y autores: relaciones `_embedded`, con endpoints específicos como respaldo.
- Detección inicial: 232 posts, 11 categorías (9 con contenido).
- Identidad: `origin = castelao_es` + `source_post_id`.
- El sincronizador preservará `status`, `seo_title` y `seo_description` locales.
- Los registros `origin = castelao_cl` nunca serán objetivos del sincronizador.

Fallback: sitemap y parsing HTML editorial, solo si la REST API deja de ser utilizable. Debe mantener timeout, reintentos acotados, User-Agent identificable, baja concurrencia y tolerancia a errores parciales.

## Riesgos identificados

- HTML histórico con shortcodes, embeds o marcado inválido.
- Medios ausentes, repetidos, demasiado grandes o con formatos no admitidos.
- Colisiones de slug con futuras publicaciones locales.
- Diferencias entre conteo de WordPress y posts realmente publicables.
- Tiempo y cuota de red durante la migración inicial de medios.
- Preservación exacta de campos locales durante sincronizaciones futuras.
- Exposición accidental de HTML no sanitizado si el pipeline se elude.
- El editor enriquecido debe evitar SSR/hydration y no inflar innecesariamente el bundle público.

## Bloqueadores

No se detectó un bloqueo crítico. La implementación puede continuar por fases.
