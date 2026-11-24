# Castelao Chile — Blog / Noticias sincronizadas desde Instituto Castelao

**Archivo maestro para Codex**  
**Fecha:** 29-09-2026  
**Proyecto:** Instituto Castelao Chile  
**Fuente editorial:** https://www.institutocastelao.com/blog/

---

## 1. Rol de Codex

Actúa como **Principal Full-Stack Engineer + Tech Lead de Instituto Castelao Chile**, con especialización en:

- Next.js 16 y React 19.
- TypeScript estricto.
- Supabase / PostgreSQL / RLS.
- Arquitectura limpia y SOLID.
- Migraciones de contenido y sincronización idempotente.
- UX/UI moderna, responsive y accesible.
- SEO técnico para publicaciones editoriales.
- Seguridad al renderizar HTML proveniente de fuentes externas.
- Performance, Core Web Vitals e imágenes optimizadas.

Tu responsabilidad no es solamente "hacer que funcione". Debes integrar esta funcionalidad respetando la arquitectura existente, el design system institucional y el panel de administración ya construido.

Antes de modificar código:

1. Audita el repositorio.
2. Identifica cómo están implementados actualmente:
   - Supabase.
   - autenticación;
   - panel de administración;
   - blog/noticias, si existe algo;
   - componentes de layout;
   - design tokens;
   - tipografías;
   - colores institucionales;
   - navegación;
   - SEO;
   - almacenamiento de imágenes;
   - migraciones;
   - testing.
3. Reutiliza lo que ya existe.
4. No dupliques tablas, servicios, tipos, hooks ni componentes si ya hay equivalentes.
5. Documenta cualquier desviación necesaria de este documento.

---

# 2. Objetivo

Castelao Chile debe disponer de una sección pública de **Blog / Noticias** que contenga las mismas publicaciones editoriales disponibles en:

https://www.institutocastelao.com/blog/

El contenido debe vivir en la infraestructura de Castelao Chile y no depender de consultar la web española en cada request.

La experiencia en Chile debe mantener el contenido editorial original, pero la interfaz debe pertenecer al sitio chileno y respetar completamente su design system.

Las únicas diferencias funcionales importantes respecto al listado de origen serán:

1. **Buscador de noticias.**
2. **Paginación clara y moderna.**

Además, el sistema debe quedar preparado para poder sincronizar futuras publicaciones sin volver a realizar una migración manual.

---

# 3. Estado observado de la fuente

Al 29-09-2026, el blog público de Instituto Castelao:

- contiene publicaciones de múltiples años;
- tiene aproximadamente 20 páginas públicas de resultados;
- publica aproximadamente 12 artículos por página;
- utiliza autores;
- tiene fecha de publicación;
- utiliza una o varias categorías;
- muestra tiempo estimado de lectura;
- utiliza imagen destacada e imágenes dentro de los artículos;
- posee extractos;
- posee contenido HTML enriquecido;
- utiliza slugs individuales;
- contiene categorías como:
  - Actualidad;
  - Adicción=Enfermedad;
  - Alcohol;
  - Cannabis;
  - Cocaína;
  - Drogas;
  - Otras drogas;
  - Testimonios;
  - Tratamientos.

La fuente debe analizarse nuevamente durante la implementación porque puede cambiar.

---

# 4. Restricciones importantes

## 4.1 No hacer scraping en cada visita

PROHIBIDO:

```text
Usuario abre /blog
→ Next.js consulta institutocastelao.com
→ parsea HTML
→ recién entonces muestra la página
```

Eso genera dependencia externa, mala performance y riesgo operacional.

La información debe importarse/sincronizarse previamente a Supabase.

---

## 4.2 No copiar el chrome de la web española

NO importar como contenido:

- header;
- navegación;
- footer;
- formulario de contacto;
- cookie banner;
- widgets;
- chat;
- teléfonos españoles;
- direcciones de centros españoles;
- scripts;
- Google Tag Manager;
- formularios de comentarios;
- elementos globales del sitio fuente.

Sí importar el contenido editorial real de cada artículo:

- título;
- slug;
- fecha;
- fecha de modificación si existe;
- autor;
- categorías;
- extracto;
- cuerpo;
- imagen destacada;
- imágenes editoriales internas;
- alt text cuando esté disponible;
- tiempo de lectura o datos necesarios para calcularlo;
- URL original.

Los CTA agregados por Castelao Chile deben utilizar exclusivamente los datos y componentes oficiales de **Castelao Chile**.

---

# 5. Estrategia de importación

## 5.1 Primera opción: WordPress REST API

Antes de escribir un scraper HTML, comprobar si la instalación de WordPress expone endpoints utilizables de forma pública, por ejemplo:

```text
/wp-json/wp/v2/posts
/wp-json/wp/v2/categories
/wp-json/wp/v2/media
/wp-json/wp/v2/users
```

Si están disponibles, esta debe ser la fuente principal.

Ventajas:

- IDs estables;
- paginación;
- fechas estructuradas;
- slugs;
- categorías;
- contenido y extractos;
- media relacionada;
- modificaciones detectables.

---

## 5.2 Fallback

Si WordPress REST no está disponible desde el entorno de ejecución:

1. localizar sitemap del blog;
2. descubrir URLs de posts;
3. descargar cada publicación desde un script de sincronización server-side;
4. parsear únicamente el contenido editorial;
5. normalizar la información;
6. guardar el resultado en Supabase.

El scraper:

- debe tener timeout;
- debe tener retry acotado;
- debe tener User-Agent identificable;
- no debe realizar concurrencia agresiva;
- no debe ejecutarse en el navegador;
- debe generar logs resumidos;
- debe tolerar errores parciales sin destruir datos previamente importados.

---

# 6. Sincronización idempotente

Crear un mecanismo similar a:

```bash
npm run blog:sync
```

o el comando equivalente según la arquitectura existente.

Ejecutarlo dos veces consecutivas sin cambios en el origen debe terminar con:

```text
created: 0
updated: 0
unchanged: N
failed: 0
```

Cada publicación importada debe tener un identificador estable de origen.

Prioridad:

1. `source_post_id`, si existe.
2. URL canónica del artículo de origen.
3. slug + origen, solamente como fallback.

No identificar posts exclusivamente por título.

---

# 7. Modelo de datos

PRIMERO auditar las tablas existentes.

Si ya existe una estructura para `posts`, `news`, `articles` o equivalente, extenderla en vez de crear un segundo CMS.

Si no existe, proponer una migración equivalente a la siguiente.

## 7.1 `blog_posts`

Campos orientativos:

```text
id                    uuid PK
slug                  text unique not null
title                 text not null
excerpt               text
content_html          text not null
content_text          text
featured_image_url    text
featured_image_alt    text
author_name           text
published_at          timestamptz
source_updated_at     timestamptz
reading_time_minutes  integer
status                enum/text: draft | published | archived
origin                enum/text: castelao_es | castelao_cl
source_post_id        text/null
source_url             text/null
source_hash            text/null
seo_title              text/null
seo_description        text/null
created_at             timestamptz
updated_at             timestamptz
```

Restricciones recomendadas:

- índice único parcial o compuesto para `origin + source_post_id`;
- `slug` único dentro de la estrategia de rutas de la aplicación;
- índices para `published_at`, `status` y búsqueda.

---

## 7.2 Categorías

Si no existe una estructura equivalente:

### `blog_categories`

```text
id
slug
name
created_at
updated_at
```

### `blog_post_categories`

```text
post_id
category_id
```

Usar PK/unique compuesto para evitar relaciones duplicadas.

---

# 8. Búsqueda

El buscador debe ser real, server-side y compatible con paginación.

Ruta objetivo:

```text
/blog?q=alcohol
/blog?q=cocaina&pagina=2
```

Requisitos:

- búsqueda por título;
- extracto;
- texto limpio del artículo;
- opcionalmente autor y categoría;
- case-insensitive;
- manejo razonable de acentos;
- debounce en UI si la navegación se produce mientras escribe;
- URL compartible;
- botón para limpiar búsqueda;
- estado sin resultados;
- mantener `q` al cambiar de página.

Priorizar PostgreSQL Full Text Search en español si encaja bien con la infraestructura actual.

No realizar:

```ts
posts.filter(...)
```

sobre todos los artículos descargados al navegador.

---

# 9. Paginación

Usar **12 artículos por página** salvo que la auditoría del diseño actual justifique claramente otra cantidad.

Formato esperado:

```text
Anterior  1  2  3  …  20  Siguiente
```

Requisitos:

- primera página en `/blog`;
- páginas siguientes usando query param estable, por ejemplo `?pagina=2`;
- conservar filtros y búsqueda;
- deshabilitar correctamente anterior/siguiente;
- scroll razonable al cambiar de página;
- navegación accesible mediante teclado;
- `aria-label` apropiados;
- no cargar todos los posts para después paginar en cliente.

La consulta debe usar `limit` + `offset` o un mecanismo equivalente y obtener el total.

---

# 10. UI de `/blog`

Integrar el blog dentro del diseño de Castelao Chile.

NO hacer una copia visual pixel-perfect del WordPress español.

Reutilizar:

- header actual;
- footer actual;
- tipografías;
- colores;
- border radius;
- sombras;
- espaciado;
- botones;
- contenedores;
- tokens;
- motion system;
- componentes existentes.

## Layout recomendado

### Hero

```text
BLOG / NOTICIAS
Información, actualidad y recursos sobre adicciones y recuperación.
```

Debajo:

```text
[ 🔎 Buscar artículos... ]
```

Puede añadirse filtro por categoría solamente si encaja naturalmente con el diseño y no complica innecesariamente el MVP.

### Grid

Desktop:

```text
3 columnas
```

Tablet:

```text
2 columnas
```

Mobile:

```text
1 columna
```

Cada tarjeta:

```text
[Imagen destacada]

[CATEGORÍA]      8 min

Título

Extracto limitado a 2–3 líneas

29 septiembre 2026

Leer artículo →
```

La tarjeta completa puede ser clickable siempre que siga siendo accesible.

---

# 11. Skeletons y estados

Las transiciones deben sentirse consistentes con el resto del proyecto.

Implementar:

- skeleton de cards;
- skeleton del artículo;
- loading state del buscador cuando corresponda;
- estado vacío;
- error boundary o manejo de error coherente;
- imagen placeholder cuando no existe imagen.

Evitar spinners genéricos si el design system actual ya utiliza skeletons.

---

# 12. Página individual

Ruta:

```text
/blog/[slug]
```

Debe contener:

1. breadcrumbs opcionales;
2. categoría(s);
3. título;
4. fecha;
5. autor;
6. tiempo de lectura;
7. imagen destacada;
8. contenido editorial;
9. CTA de Castelao Chile;
10. artículos relacionados;
11. enlace para volver al blog.

Ejemplo conceptual:

```text
Actualidad

Vuelta a la rutina y consumo de alcohol:
cómo identificar las señales de alerta

23 septiembre 2026 · Maite Pereiro · 8 min

[Imagen]

[Contenido]

────────────────────────────

¿Necesitas orientación?
Habla con el equipo de Instituto Castelao Chile.

[Contactar]
```

NO mostrar CTA españoles importados desde la plantilla de origen.

---

# 13. HTML y seguridad

El contenido proveniente del sitio fuente se considera **HTML no confiable** desde el punto de vista técnico aunque pertenezca a la misma organización.

Antes de renderizar:

- eliminar `<script>`;
- eliminar event handlers `onclick`, `onerror`, etc.;
- eliminar estilos peligrosos si corresponde;
- eliminar formularios;
- eliminar embeds innecesarios;
- validar URLs;
- preservar tags editoriales legítimos:
  - headings;
  - párrafos;
  - listas;
  - enlaces;
  - imágenes;
  - blockquotes;
  - tablas cuando existan;
  - strong/em.

Usar una librería mantenida para sanitización si el proyecto no posee una solución segura.

No crear un sanitizador regex artesanal.

Links externos:

```html
rel="noopener noreferrer"
```

cuando corresponda.

---

# 14. Shortcodes y basura heredada de WordPress

Algunos posts históricos pueden contener shortcodes o markup legado.

Ejemplos:

```text
[su_highlight ...]
[caption ...]
```

La importación debe:

1. detectar markup heredado;
2. transformarlo a HTML limpio cuando sea sencillo y determinista;
3. o eliminar el wrapper conservando el texto;
4. nunca mostrar el shortcode crudo al usuario final.

Crear fixtures/tests con al menos un artículo antiguo que contenga markup legado.

---

# 15. Imágenes

Auditar primero cómo maneja imágenes el proyecto.

Estrategia preferida para una migración robusta:

- descargar media editorial;
- almacenarla en infraestructura controlada por Castelao Chile, preferentemente Supabase Storage si ya se utiliza;
- conservar `alt`;
- reescribir URLs del contenido cuando corresponda.

Si esto aumenta demasiado el alcance inicial, se permite temporalmente utilizar las imágenes remotas de `institutocastelao.com`, pero:

- documentarlo;
- configurar correctamente `next/image`;
- no dejarlo como dependencia invisible;
- preparar un comando posterior de migración de media.

Nunca hacer hotlinking accidental sin dejarlo documentado.

---

# 16. SEO

Implementar por publicación:

- `generateMetadata`;
- title;
- description;
- Open Graph;
- Twitter card cuando aplique;
- canonical de Castelao Chile;
- `BlogPosting` / `Article` JSON-LD;
- fecha de publicación;
- fecha de modificación;
- autor;
- imagen;
- breadcrumbs schema si ya existe infraestructura;
- inclusión en sitemap.

## Importante: contenido duplicado internacional

Como el contenido editorial puede ser el mismo que el de `institutocastelao.com`, dejar documentado:

```text
SEO_DECISION_REQUIRED:
contenido España vs Chile / canonical / hreflang / localización.
```

Para esta implementación NO apuntar automáticamente el canonical chileno hacia España, porque eso puede impedir que la versión chilena funcione como landing indexable.

Usar self-canonical en Chile como comportamiento inicial y registrar esta decisión para revisión SEO.

No inventar `hreflang` recíproco si no puede implementarse también correctamente en la contraparte.

---

# 17. Contenido sensible y referencias geográficas

No modificar automáticamente afirmaciones clínicas o cifras del artículo.

Si un artículo dice explícitamente:

```text
en España...
```

conservarlo como contenido editorial original.

NO reemplazar masivamente "España" por "Chile".

Eso puede convertir información correcta en información falsa.

La localización editorial de esos contenidos puede hacerse posteriormente mediante revisión humana.

---

# 18. Integración con Admin

El panel existente de Castelao Chile contempla gestión de noticias/blog.

Después de la auditoría:

- integrar los posts importados en el módulo existente;
- mostrar claramente su origen;
- mostrar `source_url`;
- mostrar fecha de última sincronización;
- permitir preview;
- permitir filtrar por origen si aporta valor.

Evitar que una sincronización futura destruya ediciones locales.

Propuesta:

```text
origin = castelao_es
```

para posts sincronizados.

```text
origin = castelao_cl
```

para publicaciones creadas localmente.

Si el sistema permite editar una publicación sincronizada, definir explícitamente la política:

A. edición local bloqueada, o  
B. edición local implica desacoplarla de la sincronización.

NO permitir una situación ambigua donde una sincronización sobrescriba silenciosamente cambios humanos.

Para el MVP se prefiere:

```text
Publicación sincronizada = lectura/preview desde admin.
Publicación local = completamente editable.
```

---


---

# 18.1 Admin — Listado de noticias

La implementación NO se considera completa si únicamente se sincronizan los posts y aparecen en la web pública.

El módulo de **Noticias / Blog** del panel administrativo existente debe quedar actualizado para reflejar correctamente el nuevo modelo de datos.

Antes de modificarlo, auditar cómo está construido actualmente el módulo de administración.

No crear un segundo módulo de noticias si ya existe uno.

## Columnas mínimas del listado

El listado administrativo debe mostrar, como mínimo:

```text
Imagen
Título
Categoría(s)
Autor
Estado
Origen
Fecha de publicación
Última actualización
Acciones
```

Opcionalmente, cuando sea útil:

```text
Tiempo de lectura
Slug
Fecha de última sincronización
```

### Ejemplo conceptual

| Imagen | Título | Categoría | Autor | Estado | Origen | Publicación | Actualizado | Acciones |
|---|---|---|---|---|---|---|---|---|
| img | Cómo identificar... | Alcohol | Maite Pereiro | Publicado | España | 23/09/2026 | 23/09/2026 | Ver / Editar |
| img | Nueva noticia Chile | Actualidad | Admin | Borrador | Chile | — | 29/09/2026 | Editar |

## Estados visuales

Usar badges consistentes con el design system para:

```text
Publicado
Borrador
Archivado
```

y para origen:

```text
Castelao España
Castelao Chile
```

El usuario debe poder entender inmediatamente qué publicaciones son sincronizadas y cuáles son locales.

No mostrar UUIDs internos como información principal de la tabla.

## Funcionalidad del listado

Debe incluir:

- búsqueda por título;
- filtro por estado;
- filtro por origen;
- filtro por categoría;
- paginación;
- orden por fecha de publicación;
- estado vacío;
- loading/skeleton;
- acciones accesibles.

No descargar todos los posts al navegador para filtrarlos en cliente.

---

# 18.2 Admin — Crear noticia

La pantalla existente para crear una noticia debe ampliarse para soportar TODOS los campos editoriales necesarios.

No agregar campos simplemente a la base de datos y olvidarlos en el formulario.

## Campos requeridos

### Información principal

```text
Título *
Slug *
Extracto / bajada
Contenido *
Autor
Categoría(s)
Estado *
Fecha de publicación
```

El slug:

- debe generarse automáticamente a partir del título;
- debe poder editarse manualmente;
- debe validar duplicados;
- debe normalizar caracteres;
- no debe cambiar automáticamente después de que el usuario lo haya editado manualmente.

### Imagen destacada

```text
Imagen destacada
Texto alternativo
```

Requisitos:

- preview;
- reemplazar;
- eliminar;
- validación de formato y tamaño según las reglas actuales;
- alt text editable;
- no obligar al usuario a introducir una URL manual si el proyecto ya usa Supabase Storage.

### Contenido

El editor debe soportar como mínimo:

- H2;
- H3;
- párrafo;
- negrita;
- cursiva;
- listas;
- enlaces;
- blockquote;
- imágenes;
- separación visual.

Auditar primero qué editor existe actualmente.

Si no existe uno suficientemente usable, incorporar uno moderno y compatible con React 19 / Next.js 16.

NO implementar un editor rich-text casero.

La representación almacenada debe ser compatible con el renderer público y con la estrategia de sanitización definida en este documento.

### SEO

Agregar una sección claramente identificada:

```text
SEO
```

con:

```text
SEO title
Meta description
```

Opcionalmente mostrar:

```text
Vista previa de resultado de búsqueda
```

No obligar a completar SEO manualmente.

Fallback esperado:

```text
seo_title ?? title
seo_description ?? excerpt
```

### Publicación

Debe poder elegirse:

```text
Borrador
Publicado
Archivado
```

Cuando se publica:

- establecer `published_at` si está vacío;
- respetar una fecha de publicación configurada manualmente si el sistema soporta publicación programada;
- nunca exponer drafts públicamente.

Para el MVP, si NO existe infraestructura para scheduling real, no simular publicación programada: almacenar fecha pero dejar claramente documentado el alcance.

### Origen

En creación manual:

```text
origin = castelao_cl
```

Debe asignarse automáticamente.

El administrador no debe poder crear manualmente un post fingiendo ser:

```text
origin = castelao_es
```

---

# 18.3 Admin — Editar noticia

La pantalla de edición debe cargar TODOS los campos existentes de la noticia.

Esto incluye:

```text
Título
Slug
Extracto
Contenido
Autor
Categorías
Imagen destacada
Alt text
Estado
Fecha de publicación
SEO title
SEO description
Origen
Source URL, cuando exista
Source updated at, cuando exista
Reading time
Created at
Updated at
```

No deben existir datos presentes en la base de datos que desaparezcan al abrir el formulario y luego sean accidentalmente sobrescritos con `null` al guardar.

## Diseño recomendado

Dividir el formulario en bloques claros.

### Contenido

```text
Título
Slug
Extracto
Editor
```

### Taxonomía

```text
Categorías
Autor
```

### Imagen

```text
Featured image
Alt
```

### Publicación

```text
Estado
Fecha
```

### SEO

```text
SEO title
Meta description
```

### Información de sistema

```text
Origen
URL original
Última sincronización
Creado
Actualizado
```

La información de sistema debe ser principalmente **read-only**.

En desktop se puede utilizar:

```text
Contenido principal  | Sidebar de publicación
```

si encaja con el patrón existente del admin.

En mobile debe convertirse correctamente a una sola columna.

---

# 18.4 Comportamiento de posts sincronizados desde España

Un post sincronizado desde España debe mostrar claramente:

```text
Origen: Castelao España
```

y, cuando esté disponible:

```text
Ver publicación original
```

El enlace debe abrir `source_url`.

## Protección contra sobrescrituras

Para el MVP:

### Campos sincronizados desde España

Tratar como fuente de verdad externa:

```text
title
slug
excerpt
content_html
author
categories
featured image
published_at
source_updated_at
```

Estos campos NO deben ser libremente editables si una futura sincronización los va a reemplazar.

La UI puede mostrarlos en modo read-only.

### Campos locales permitidos

Puede permitirse gestionar localmente:

```text
status
seo_title
seo_description
```

si la arquitectura lo soporta sin perderlos al sincronizar.

La sincronización debe actualizar únicamente los campos definidos como `source-managed`.

Nunca hacer un `upsert` que sobrescriba indiscriminadamente todas las columnas.

## Alternativa futura

Si se desea editar completamente una publicación importada, implementar posteriormente una acción explícita:

```text
Desvincular de Castelao España
```

Esto debería:

```text
origin -> castelao_cl
source_post_id -> null
source_url -> conservar como referencia histórica o mover a metadata
sync_enabled -> false
```

NO implementar esta funcionalidad ahora salvo que encaje de forma limpia en el modelo existente.

Pero dejarla contemplada en documentación.

---

# 18.5 Form validation

Crear schema de validación reutilizable.

Si el proyecto utiliza Zod, mantener Zod.

Validaciones mínimas:

```text
title: requerido
slug: requerido + formato válido
content: requerido
status: valor permitido
seo title: largo razonable
meta description: largo razonable
published_at: fecha válida
categories: IDs válidos
featured image: formato permitido
```

Los errores:

- deben aparecer junto al campo correspondiente;
- deben ser comprensibles;
- no deben borrar el contenido ingresado;
- deben funcionar tanto client como server-side cuando corresponda.

---

# 18.6 Autosave / navegación accidental

Auditar el comportamiento actual del admin.

Si ya existe protección de cambios no guardados, reutilizarla.

Si no existe, como mínimo:

- detectar cambios pendientes;
- advertir antes de abandonar el formulario accidentalmente cuando sea viable;
- deshabilitar doble submit;
- mostrar estado `Guardando...`;
- mostrar confirmación al guardar;
- manejar errores del servidor sin perder el formulario.

No implementar un sistema de autosave complejo si no existe infraestructura previa.

---

# 18.7 Acciones administrativas

Desde el listado o detalle deben existir las acciones coherentes con permisos:

```text
Ver
Editar
Publicar
Enviar a borrador
Archivar
```

Eliminar físicamente una noticia NO debe ser la acción principal.

Preferir:

```text
Archivar
```

Si ya existe una funcionalidad de eliminación, debe requerir confirmación explícita.

Para publicaciones sincronizadas de España, evitar un `DELETE` que provoque que la siguiente sincronización vuelva a crear silenciosamente el registro.

Si un artículo sincronizado debe ocultarse en Chile:

```text
status = archived
```

y la sincronización debe respetar este estado local si está definido como override.

---

# 18.8 Categorías en Admin

La creación y edición debe permitir seleccionar múltiples categorías.

Si la categoría importada desde España no existe:

```text
sync → crear categoría → asociar post
```

No duplicar:

```text
Alcohol
alcohol
ALCOHOL
```

Normalizar mediante `slug`.

Para noticias creadas en Chile, reutilizar el mismo catálogo.

Si ya existe gestión de categorías en el admin, adaptarla.

Si NO existe, no es obligatorio crear un CRUD completo de categorías para el MVP, pero la selección debe funcionar correctamente.

---

# 18.9 Tiempo de lectura

Para publicaciones importadas:

- conservar el dato de la fuente si existe y es confiable;
- en caso contrario calcularlo.

Para posts creados en Chile:

- calcularlo automáticamente a partir del contenido;
- no pedirle al administrador que escriba manualmente "8 minutos".

El campo puede mostrarse en edición como información read-only:

```text
Tiempo estimado de lectura: 8 min
```

---

# 18.10 Preview desde Admin

Crear o reutilizar una acción:

```text
Vista previa
```

Para drafts, la preview NO debe requerir publicar primero.

Implementarla de manera segura:

- autenticada;
- sin indexación;
- no accesible públicamente mediante URL predecible sin autorización.

Si la arquitectura actual no permite preview seguro en este sprint, documentarlo como pendiente en:

```text
CASTELAO_CHILE_BLOG_STATUS.md
```

No exponer drafts para resolver rápidamente el preview.

---

# 18.11 UX/UI del Admin de Noticias

La gestión de noticias debe respetar el rediseño actual del panel de Castelao Chile.

Requisitos:

- breadcrumb o encabezado que deje claro dónde está el usuario;
- título de página;
- acciones primarias visibles;
- formularios con jerarquía visual;
- labels persistentes;
- estados de carga mediante skeletons;
- errores visibles;
- responsive;
- focus states;
- contraste;
- botones consistentes;
- confirmaciones no intrusivas;
- evitar modales enormes para editar contenido largo.

Rutas conceptuales:

```text
/admin/noticias
/admin/noticias/nueva
/admin/noticias/[id]
```

Adaptar los nombres a las rutas reales del proyecto.

NO romper navegación ni layout del administrador para hacer esta implementación.


# 19. Sincronización futura

Debe quedar disponible un servicio reutilizable:

```ts
syncCastelaoBlog()
```

y un CLI/script.

Opcionalmente, si la infraestructura y plan de despliegue actuales lo permiten, dejar preparado un endpoint protegido para cron:

```text
/api/cron/blog-sync
```

Seguridad:

```text
Authorization: Bearer <CRON_SECRET>
```

No dejar endpoints públicos capaces de iniciar una importación masiva.

No agregar un cron productivo sin verificar primero:

- límites del plan;
- comportamiento de Vercel;
- duración máxima;
- cantidad de posts/media;
- secretos requeridos.

El comando manual debe ser suficiente para operar el MVP.

---

# 20. Performance

Objetivos:

- Server Components por defecto.
- Client Components únicamente donde agregan interacción.
- consultas paginadas;
- imágenes optimizadas;
- evitar bundles innecesarios;
- no enviar el `content_html` de todos los posts al listado;
- seleccionar únicamente campos requeridos por cada vista;
- cache/revalidation compatible con la estrategia actual;
- invalidar caché al sincronizar si corresponde.

---

# 21. Accesibilidad

Cumplir como mínimo:

- headings jerárquicos;
- contraste AA;
- focus visible;
- navegación por teclado;
- inputs con `<label>`;
- paginación semántica;
- `aria-current="page"`;
- alt text;
- no depender del color para indicar estado;
- respetar `prefers-reduced-motion`.

---

# 22. Tests mínimos

Crear tests coherentes con el stack existente.

Cubrir:

### Importer

- crea post nuevo;
- actualiza post modificado;
- no duplica al ejecutar dos veces;
- conserva post local;
- procesa categorías;
- procesa múltiples categorías;
- maneja un artículo sin imagen;
- maneja shortcode legado;
- rechaza scripts/event handlers.

### Search

- encuentra por título;
- encuentra por contenido;
- no devuelve drafts;
- mantiene paginación;
- búsqueda vacía equivale al listado general.

### Pagination

- primera página;
- página intermedia;
- última página;
- página fuera de rango.

### Routing

- slug existente = 200;
- slug inexistente = 404.

---

# 23. QA manual obligatorio

Desktop:

- Chrome;
- viewport ancho.

Mobile:

- al menos 375 px.

Validar:

- `/blog`;
- `/blog?pagina=2`;
- `/blog?q=alcohol`;
- `/blog?q=alcohol&pagina=2` si existen suficientes resultados;
- `/blog/[slug]`;
- sin resultados;
- imagen faltante;
- artículo largo;
- artículo histórico con HTML legado;
- navegación mediante teclado.

---

# 24. Orden de implementación

## Fase 0 — Auditoría

Entregar primero un resumen:

```text
BLOG_AUDIT.md
```

Debe explicar:

- qué existe;
- qué se reutiliza;
- qué se cambia;
- migraciones necesarias;
- riesgos;
- decisión sobre fuente WordPress API vs fallback.

Después continuar con la implementación, salvo que aparezca un bloqueo crítico.

---

## Fase 1 — Modelo de datos

- migraciones;
- índices;
- RLS;
- tipos;
- repositories/services.

---

## Fase 2 — Importer

- cliente de fuente;
- parser/normalizador;
- sanitizador;
- upsert;
- categorías;
- media;
- logs;
- script CLI.

Ejecutar primero contra un subconjunto pequeño.

Luego realizar import completo.

---

## Fase 3 — Listado público

- `/blog`;
- cards;
- grid;
- skeleton;
- paginación;
- búsqueda;
- estados vacíos.

---

## Fase 4 — Detalle

- `/blog/[slug]`;
- renderer;
- metadata;
- JSON-LD;
- related posts;
- CTA Chile.

---

## Fase 5 — Admin

- integrar publicaciones;
- origen;
- preview;
- estado de sincronización.

---

## Fase 6 — SEO + QA

- sitemap;
- metadata;
- canonical;
- accessibility;
- responsive;
- tests;
- lint;
- typecheck;
- build.

---

# 25. RLS

La lectura pública debe limitarse a:

```text
status = 'published'
```

Operaciones administrativas:

- únicamente usuarios autenticados y autorizados;
- respetar el modelo de roles existente;
- no crear bypass inseguro de RLS desde el cliente.

Service role, si se necesita para la importación:

- únicamente server-side;
- nunca exponerlo al browser;
- nunca usar variables `NEXT_PUBLIC_*`.

---

# 26. Logs de importación

Al terminar una sincronización mostrar algo similar:

```text
Castelao Blog Sync

Source posts discovered: 231
Created: 231
Updated: 0
Unchanged: 0
Failed: 0
Media migrated: 412
Duration: ...
```

En ejecuciones siguientes:

```text
Source posts discovered: 231
Created: 0
Updated: 0
Unchanged: 231
Failed: 0
```

No registrar contenido completo ni secretos.

---

# 27. Archivos de documentación

Al finalizar crear/actualizar:

```text
docs/CASTELAO_CHILE_BLOG.md
```

Debe contener:

- arquitectura;
- schema;
- cómo ejecutar import;
- variables de entorno;
- cómo agregar posts locales;
- política de posts sincronizados;
- troubleshooting;
- estrategia SEO.

Y:

```text
docs/CASTELAO_CHILE_BLOG_STATUS.md
```

Formato obligatorio:

```md
# Estado Blog Castelao Chile

## Completado
- [x] ...

## Pendiente
- [ ] ...

## Deuda técnica
- ...

## Riesgos
- ...

## Última sincronización
- ...

## Métricas
- posts:
- categorías:
- imágenes:
- errores:
```

Este archivo debe mantenerse actualizado para que los siguientes sprints sepan exactamente qué está hecho.

---

# 28. Variables de entorno

No inventar nombres si ya existe una convención.

Si se requieren nuevas variables, documentarlas en `.env.example`.

Ejemplo orientativo:

```text
CASTELAO_SOURCE_BASE_URL=https://www.institutocastelao.com
BLOG_SYNC_CRON_SECRET=
```

No duplicar variables ya existentes de Supabase.

---

# 29. Dependencias

Antes de instalar cualquier paquete:

1. revisar si el proyecto ya tiene una solución equivalente;
2. comprobar compatibilidad con Next.js 16 / React 19;
3. elegir paquetes mantenidos;
4. evitar librerías pesadas para tareas triviales.

Es aceptable incorporar una dependencia especializada para:

- sanitización HTML;
- parsing HTML;
- lectura estimada;
- utilidades de contenido;

siempre que esté justificada.

Registrar la decisión en el reporte final.

---

# 30. Diseño y animaciones

Usar las librerías que ya existan.

No incorporar animaciones excesivas.

Las animaciones deben:

- reforzar jerarquía;
- ser rápidas;
- no bloquear interacción;
- respetar `prefers-reduced-motion`.

El blog debe sentirse parte del sitio institucional, no como un micrositio diferente.

---

# 31. Lo que NO hay que hacer

- No hardcodear 200+ artículos en TypeScript/JSON.
- No copiar HTML completo de páginas WordPress.
- No consultar WordPress en cada request público.
- No utilizar `dangerouslySetInnerHTML` con HTML sin sanitizar.
- No copiar formularios ni scripts españoles.
- No duplicar un CMS ya existente.
- No sobreescribir posts locales.
- No romper rutas actuales.
- No cambiar el design system global para resolver únicamente el blog.
- No reemplazar referencias geográficas dentro de artículos de forma automática.
- No desplegar a producción sin que lint, typecheck, tests y build estén OK.

---

# 32. Criterios de aceptación

La tarea está terminada solamente cuando:

- [ ] todas las publicaciones detectables del blog origen fueron importadas;
- [ ] la cantidad origen/destino fue contrastada;
- [ ] una segunda sincronización no genera duplicados;
- [ ] `/blog` funciona;
- [ ] buscador funciona;
- [ ] paginación funciona;
- [ ] búsqueda + paginación funcionan juntas;
- [ ] `/blog/[slug]` funciona;
- [ ] imágenes funcionan;
- [ ] contenido antiguo no muestra shortcodes rotos;
- [ ] no se importaron headers/footer/forms/scripts del WordPress;
- [ ] CTA utiliza información de Castelao Chile;
- [ ] diseño usa el design system institucional;
- [ ] responsive validado;
- [ ] accesibilidad básica validada;
- [ ] SEO técnico implementado;
- [ ] sitemap contiene artículos;
- [ ] RLS validada;
- [ ] admin reconoce posts sincronizados;
- [ ] listado admin muestra las columnas editoriales necesarias;
- [ ] crear noticia permite completar todos los campos requeridos;
- [ ] editar noticia recupera y persiste correctamente todos sus campos;
- [ ] imagen destacada y alt text funcionan desde admin;
- [ ] categorías múltiples funcionan;
- [ ] SEO title y meta description pueden gestionarse;
- [ ] posts sincronizados muestran origen y source URL;
- [ ] campos gestionados por la sincronización están protegidos frente a sobrescritura manual;
- [ ] cambios locales permitidos no son destruidos por una sincronización;
- [ ] drafts no son públicos;
- [ ] formularios manejan validación y errores sin perder información;
- [ ] posts locales están protegidos frente al sync;
- [ ] lint OK;
- [ ] typecheck OK;
- [ ] tests OK;
- [ ] build OK;
- [ ] documentación actualizada.

---

# 33. Entrega final requerida a Codex

Al terminar responde con este formato:

```md
## Resultado

### Auditoría inicial
...

### Arquitectura implementada
...

### Base de datos
...

### Importación
- Source detectado:
- Posts detectados:
- Posts creados:
- Posts actualizados:
- Posts fallidos:
- Categorías:
- Imágenes:

### Rutas
- ...

### UX/UI
- ...

### Admin de noticias
- Columnas implementadas:
- Campos de creación:
- Campos de edición:
- Comportamiento de posts España:
- Comportamiento de posts Chile:
- Preview:
- Filtros/búsqueda/paginación:
- Pendientes:

### SEO
- ...

### Seguridad
- ...

### Archivos principales modificados
- ...

### Migraciones creadas
- ...

### Dependencias nuevas
- ...

### Validaciones
- lint:
- typecheck:
- tests:
- build:
- audit:

### Pendiente
- ...

### Riesgos / decisiones que requieren revisión
- ...

### Estado
GO / NO-GO
```

No indicar **GO** si la migración de contenido no fue contrastada, la sanitización no fue validada o el build falla.

---

# 34. Objetivo visual final

El resultado debe sentirse como:

> “El blog oficial de Instituto Castelao integrado nativamente dentro de la experiencia digital moderna de Castelao Chile.”

No como:

> “Una copia incrustada de un WordPress antiguo.”

Prioridades:

1. fidelidad editorial;
2. seguridad;
3. arquitectura mantenible;
4. UX;
5. buscabilidad;
6. performance;
7. SEO;
8. facilidad de sincronización futura.
