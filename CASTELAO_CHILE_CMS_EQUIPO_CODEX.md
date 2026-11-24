# Castelao Chile — CMS Administrable + Equipo Profesional

**Documento maestro para Codex**  
**Proyecto:** Instituto Castelao Chile  
**Fecha:** 30-09-2026  
**Contexto:** El sitio público ya existe, el blog/noticias ya fue implementado y el panel administrativo ya funciona con autenticación, Supabase y gestión de noticias.

---

# 1. Rol de Codex

Actúa como **Principal Full-Stack Engineer + Tech Lead + CMS Architect de Instituto Castelao Chile**, con foco en:

- Next.js 16.
- React 19.
- TypeScript estricto.
- Supabase / PostgreSQL / RLS.
- Arquitectura limpia.
- Diseño de CMS estructurados.
- UX/UI de paneles administrativos.
- SEO técnico.
- Performance y accesibilidad.
- Migraciones seguras.
- Preservación de funcionalidades existentes.

Tu misión es transformar la web institucional de Castelao Chile en una web **auto administrable desde el panel existente**, de modo que el equipo pueda modificar páginas, textos, imágenes, botones, SEO, preguntas frecuentes y profesionales sin tener que editar código.

La referencia conceptual es una experiencia similar a WordPress en facilidad de administración, pero NO queremos copiar WordPress ni construir un page builder completamente libre.

El CMS debe ser **estructurado, seguro, mantenible y coherente con el design system actual**.

---

# 2. Contexto importante del proyecto

Ya existe:

- sitio público;
- diseño institucional;
- navegación;
- Supabase;
- autenticación;
- panel administrativo;
- módulo de noticias/blog;
- creación y edición de noticias;
- publicación de artículos importados desde Instituto Castelao España;
- estructura de administración ya funcional.

## Regla crítica

**NO crear un segundo administrador.**

**NO crear un segundo sistema de autenticación.**

**NO duplicar Supabase clients, roles, layouts, navegación admin ni patrones existentes.**

Todo lo solicitado en este documento debe integrarse al administrador ya construido.

Antes de modificar código:

1. auditar el repositorio;
2. localizar el admin actual;
3. identificar el modelo de auth;
4. identificar permisos/RLS;
5. identificar tablas del blog;
6. identificar design system;
7. identificar componentes de formularios;
8. identificar sistema de imágenes;
9. identificar patrones de loading/skeleton;
10. identificar cómo se gestionan metadata y SEO.

Reutilizar lo que ya funciona.

---

# 3. Objetivo general

La web debe quedar editable desde el administrador de forma similar a un CMS profesional.

El equipo autorizado debe poder administrar:

```text
Páginas
Equipo profesional
Preguntas frecuentes
Imágenes
SEO
CTAs
Datos institucionales configurables
```

El blog/noticias YA EXISTE y debe seguir funcionando.

No romper:

```text
/admin/noticias
/blog
/blog/[slug]
```

ni sus equivalentes reales.

---

# 4. Cambio conceptual: Marcelo deja de ser una página principal del menú

La propuesta editorial original contempla una página específica para Marcelo Montiel.

La nueva arquitectura debe cambiar esto.

## Menú público deseado

```text
Inicio
El Instituto
Tratamiento
Nuestro método
Familias
Equipo
Preguntas frecuentes
Contacto
```

Además debe existir:

```text
Recovery 40
```

según la ubicación que mejor encaje con la navegación actual.

## Equipo

En lugar de mostrar:

```text
Marcelo Montiel
```

como item principal del menú, crear:

```text
Equipo
```

Ruta recomendada:

```text
/equipo
```

---

# 5. Página pública `/equipo`

Crear una página institucional para mostrar a los distintos profesionales de Castelao Chile.

Debe ser administrable desde el panel.

## Hero orientativo

```text
Nuestro equipo

Profesionales y personas con experiencia especializada
en acompañar procesos de recuperación.
```

No hardcodear este texto si se crea infraestructura CMS para la página.

Debe poder editarse desde admin.

---

# 6. Tarjetas del equipo

Cada profesional debe mostrarse mediante una tarjeta consistente con el design system.

Información posible:

```text
Foto
Nombre completo
Cargo / rol
Especialidad
Descripción breve
Credenciales resumidas
CTA: Conocer perfil
```

Ejemplo conceptual:

```text
[ fotografía ]

Marcelo Montiel Arzola

Director Instituto Castelao Chile
Terapeuta en Adicciones
Intervencionista Familiar
Coach ICC

[ Conocer perfil ]
```

Las tarjetas deben ser responsive.

Desktop:

```text
3 columnas aproximadamente
```

Tablet:

```text
2 columnas
```

Mobile:

```text
1 columna
```

Adaptar según el diseño real.

---

# 7. Single page para cada profesional

Arquitectura:

```text
/equipo/[slug]
```

Ejemplo:

```text
/equipo/marcelo-montiel
```

Marcelo debe tener su propia página individual.

La arquitectura debe permitir posteriormente:

```text
/equipo/nombre-profesional
```

sin crear código nuevo para cada persona.

---

# 8. Página individual de Marcelo Montiel

Marcelo debe ser el primer profesional completo dentro del nuevo módulo.

Contenido editorial base:

```text
Marcelo Montiel Arzola
```

Cargo:

```text
Director Instituto Castelao Chile
Terapeuta en Adicciones
Intervencionista Familiar
Coach ICC
```

La página debe poder incluir:

- fotografía principal;
- experiencia profesional;
- más de veinte años de recuperación personal;
- experiencia con pacientes y familias;
- participación en televisión y radio;
- intervención en crisis;
- charlas y conferencias;
- mirada personal sobre la recuperación;
- CTA de contacto;
- CTA para charlas/conferencias.

Frase editorial:

> “No me interesa solamente que una persona deje de consumir. Me interesa saber cómo va a vivir después.”

CTA:

```text
Solicitar información sobre charlas
```

Todo esto debe ser administrable.

No dejar el contenido editorial largo directamente hardcodeado en componentes React.

---

# 9. Modelo de CMS: principio de diseño

Queremos facilidad similar a WordPress, pero manteniendo control sobre la interfaz.

NO construir un editor donde el administrador pueda insertar HTML arbitrario.

NO construir un page builder estilo Elementor con posición absoluta.

NO guardar páginas completas como un único bloque HTML gigante.

Usar un **CMS por bloques estructurados**.

Ejemplo:

```text
Página
 ├── Hero
 ├── Texto + Imagen
 ├── Métricas
 ├── Cards
 ├── CTA
 ├── FAQ
 └── Contacto
```

Cada bloque:

- tiene un tipo;
- tiene datos validados;
- tiene posición;
- puede activarse/desactivarse;
- puede editarse desde admin;
- se renderiza con un componente controlado por el proyecto.

Esto permite flexibilidad sin romper el diseño.

---

# 10. Arquitectura de datos propuesta

PRIMERO auditar la base de datos existente.

Si ya existen tablas equivalentes, extenderlas.

No duplicarlas.

Si no existen, proponer algo equivalente a lo siguiente.

## 10.1 `cms_pages`

```text
id                  uuid PK
slug                text unique not null
title               text not null
nav_label           text
page_type           text
status              draft | published | archived
seo_title           text
seo_description     text
og_image_url        text
show_in_navigation  boolean
navigation_order    integer
published_at        timestamptz
created_at          timestamptz
updated_at          timestamptz
updated_by          uuid/null
```

Ejemplos de `slug`:

```text
inicio
el-instituto
tratamiento
recovery-40
nuestro-metodo
familias
equipo
preguntas-frecuentes
contacto
```

## 10.2 `cms_page_sections`

```text
id
page_id
section_type
title
subtitle
data jsonb
sort_order
is_enabled
created_at
updated_at
```

El campo `data` debe validarse según `section_type`.

No aceptar JSON arbitrario sin schema.

Ejemplo:

```ts
section_type = "hero"
data = {
  eyebrow: "...",
  title: "...",
  description: "...",
  primaryCta: {...},
  secondaryCta: {...},
  image: {...}
}
```

---

# 11. Tipos de bloques permitidos

Crear un registry tipado.

Ejemplo:

```ts
type CmsSectionType =
  | "hero"
  | "rich_text"
  | "text_image"
  | "feature_cards"
  | "stats"
  | "principles"
  | "steps"
  | "cta"
  | "faq"
  | "pricing"
  | "warning"
  | "team_preview"
  | "gallery";
```

No todos tienen que implementarse si el sitio ya dispone de componentes equivalentes.

La auditoría inicial debe determinar qué reutilizar.

---

# 12. Registry de componentes

Crear algo equivalente:

```ts
const sectionRegistry = {
  hero: HeroSection,
  rich_text: RichTextSection,
  text_image: TextImageSection,
  feature_cards: FeatureCardsSection,
  stats: StatsSection,
  principles: PrinciplesSection,
  steps: StepsSection,
  cta: CTASection,
  faq: FAQSection,
  pricing: PricingSection,
  warning: WarningSection,
  team_preview: TeamPreviewSection,
  gallery: GallerySection,
}
```

Cada componente debe recibir datos validados y tipados.

---

# 13. Validación de bloques

Usar el sistema de schemas existente.

Si el proyecto usa Zod, mantener Zod.

Crear schemas separados por bloque.

Validar tanto:

- server-side;
- admin;
- render público cuando corresponda.

Un registro inválido no debe romper toda la página.

---

# 14. Renderizado público

Las páginas públicas deben renderizarse desde el CMS.

No es obligatorio cambiar las URLs actuales.

Preferir conservar URLs existentes para evitar regresiones SEO.

Ejemplos:

```text
/instituto
/tratamiento
/nuestro-enfoque
/familias
/preguntas-frecuentes
/contacto
```

Si una ruta existente actualmente tiene otro slug:

- conservar la URL;
- mapearla a su página CMS;
- no cambiar rutas sin necesidad.

---

# 15. Performance

Preferir:

- Server Components;
- consultas server-side;
- cache;
- revalidation;
- invalidación después de publicar;
- selección mínima de columnas.

Después de modificar/publicar contenido:

```text
revalidatePath(...)
```

o estrategia equivalente.

---

# 16. Draft vs Published

El CMS debe distinguir:

```text
Borrador
Publicado
Archivado
```

El público solo puede acceder a:

```text
published
```

Los administradores pueden acceder a drafts desde el panel.

---

# 17. Preview

Implementar preview segura cuando sea razonablemente compatible con la arquitectura existente.

Debe permitir:

```text
Editar página
→ Vista previa
→ Ver cambios sin publicar
```

La preview:

- debe requerir autenticación o token seguro;
- debe llevar `noindex`;
- no debe exponer drafts públicamente.

---

# 18. Admin — nueva sección `Páginas`

Agregar al menú del administrador actual:

```text
Páginas
```

No crear otro sidebar.

No crear otro layout.

Debe usar el mismo sistema del módulo de Noticias.

Ruta conceptual:

```text
/admin/paginas
```

---

# 19. Listado de páginas

Columnas mínimas:

```text
Página
Ruta
Estado
Última actualización
Actualizado por
Acciones
```

Acciones:

```text
Editar
Vista previa
Ver publicada
```

Para páginas core preferir archivar/ocultar antes que eliminar físicamente.

---

# 20. Editor de página

Pantalla conceptual:

```text
/admin/paginas/[id]
```

Debe contener:

## Cabecera

```text
Nombre de página
Ruta
Estado
Última actualización

[Vista previa] [Guardar borrador] [Publicar]
```

---

# 21. Editor por bloques

Mostrar las secciones de la página en orden.

Cada bloque debe poder:

- editarse;
- colapsarse;
- activarse/desactivarse;
- reordenarse;
- guardar;
- validarse.

---

# 22. Reordenamiento

Permitir reordenar secciones mediante drag & drop accesible o controles subir/bajar.

Si se instala una librería:

- que sea mantenida;
- compatible con React 19;
- liviana;
- justificada.

---

# 23. Editor rich text

Para bloques textuales, usar el editor existente si ya fue agregado para Blog.

**NO instalar otro editor si el módulo de noticias ya dispone de uno apropiado.**

Reutilizar:

- toolbar;
- renderer;
- sanitización;
- tipos;
- estilos.

---

# 24. SEO por página

Agregar una sección:

```text
SEO
```

con:

```text
SEO title
Meta description
OG image
Slug/ruta cuando sea editable de forma segura
```

La metadata pública debe generarse desde estos campos.

---

# 25. Admin — módulo Equipo

Agregar en el administrador actual:

```text
Equipo
```

Ruta conceptual:

```text
/admin/equipo
```

Debe coexistir con:

```text
/admin/noticias
/admin/paginas
```

---

# 26. Modelo `professionals`

Si no existe estructura equivalente:

```text
id
slug
full_name
short_name
role
credentials
short_bio
bio
recovery_experience
professional_experience
featured_quote
profile_image_url
profile_image_alt
email
phone
linkedin_url
instagram_url
cta_label
cta_url
is_featured
status
sort_order
seo_title
seo_description
created_at
updated_at
```

No todos los campos tienen que ser obligatorios.

---

# 27. Campos del profesional

Formulario:

## Identidad

```text
Nombre completo *
Slug *
Cargo principal *
Credenciales
```

## Presentación

```text
Descripción breve
Biografía
Experiencia profesional
Experiencia relevante de recuperación, si se desea publicar
Frase destacada
```

## Media

```text
Foto principal
Alt text
Galería opcional
```

## Contacto / redes

```text
Email
Teléfono
LinkedIn
Instagram
```

## CTA

```text
Texto
Destino
```

## Configuración

```text
Estado
Destacado
Orden
```

## SEO

```text
SEO title
Meta description
```

---

# 28. Marcelo como primer registro

Crear/migrar a Marcelo Montiel como profesional.

Slug:

```text
marcelo-montiel
```

Ruta:

```text
/equipo/marcelo-montiel
```

No crear un componente exclusivo que impida replicar el patrón con otros profesionales.

---

# 29. Página `/equipo`

Debe tomar automáticamente profesionales publicados ordenados por `sort_order`.

Flujo:

```text
Admin
→ Equipo
→ Crear profesional
→ Publicar
→ aparece en /equipo
→ tiene /equipo/[slug]
```

---

# 30. Home — sección Equipo

Si la página Inicio incluye equipo, crear/reutilizar bloque:

```text
team_preview
```

Preferible:

```text
is_featured = true
```

CTA:

```text
Conoce a nuestro equipo
```

→ `/equipo`

---

# 31. Contenido institucional a migrar

El documento editorial entregado por el cliente debe utilizarse como base para las páginas.

Primero comparar:

```text
contenido actual
vs
contenido solicitado
```

Luego migrar al CMS.

---

# 32. Inicio

Debe quedar administrable con:

- hero;
- bajada;
- línea metodológica;
- CTA de evaluación;
- CTA WhatsApp;
- bloques principales;
- métricas;
- precio de evaluación.

Contenido base:

```text
Dejar de consumir es sólo el comienzo.
Tratamiento ambulatorio especializado en adicciones para pacientes y familias.
Modelo Minnesota · Terapia grupal · Psicología · Familia · Seguimiento terapéutico
Evaluación inicial: $35.000 CLP
```

---

# 33. El Instituto

Debe cubrir:

- qué es Castelao Chile;
- comprensión de la adicción;
- tratamiento más allá del consumo;
- relación metodológica con España;
- principios;
- dirección;
- equipo.

Principios:

```text
Abstinencia
Reconocimiento
Responsabilidad
Honestidad
Estructura
Familia
Continuidad
```

---

# 34. Tratamiento

Contenido administrable:

```text
Terapia grupal
Intervención individual de adicciones
Psicoterapia individual
Trabajo semanal con familias
Seguimiento cotidiano
Actividad física terapéutica
Prevención de recaídas
Controles toxicológicos cuando sean indicados
Coordinación psiquiátrica cuando corresponda
```

Precio:

```text
Programa Ambulatorio: $550.000 CLP mensuales
```

La psiquiatría NO debe presentarse como incluida en la mensualidad.

---

# 35. Recovery 40

Debe quedar administrable, incluyendo:

- título;
- descripción;
- para quién está indicado;
- qué incluye;
- objetivos;
- continuidad posterior;
- precio;
- advertencia clínica;
- CTA.

Precio referencial:

```text
$4.500.000 CLP por 40 días, sujeto a evaluación y condiciones de ingreso.
```

Advertencia:

```text
Recovery 40 no es una hospitalización ni reemplaza una desintoxicación médica cuando esta es necesaria.
```

---

# 36. Nuestro método

Administrable.

Debe cubrir:

```text
Modelo Minnesota
Enfoque cognitivo-conductual-contextual
Recuperación en la vida real
Prevención de recaídas
Base del Camino
Medio Camino
```

Y señales previas a recaída.

---

# 37. Familias

Debe quedar administrable.

Título base:

```text
La familia también necesita recuperación.
```

CTA:

```text
Quiero orientación para un familiar
```

---

# 38. Preguntas frecuentes

El FAQ debe administrarse desde el panel.

Modelo orientativo:

```text
faq_items
id
question
answer
category
sort_order
is_enabled
created_at
updated_at
```

UI pública:

```text
accordion
```

---

# 39. Contacto

Administrable en contenidos, pero el formulario debe mantener su lógica funcional.

Debe permitir editar:

- título;
- textos;
- precios;
- CTAs;
- aviso de urgencias.

No romper la recepción actual de formularios.

---

# 40. Configuración global del sitio

Agregar una sección `Configuración` solo si no existe ya.

Campos posibles:

```text
WhatsApp
Teléfono
Correo institucional
Dirección
Texto del botón de evaluación
URL de evaluación
Redes sociales
```

Estos datos deben reutilizarse en:

```text
header
footer
CTA
contacto
botón flotante
```

No duplicar WhatsApp y datos institucionales en múltiples páginas.

---

# 41. Datos pendientes

No publicar automáticamente datos que aún requieren confirmación.

Entre ellos:

```text
Dirección pública definitiva
Correo institucional
Dominio oficial definitivo
WhatsApp comercial definitivo
Nombres completos y credenciales de todos los profesionales
Fotografías autorizadas
Sistema definitivo para agendar
```

Si actualmente existen valores productivos confirmados en el proyecto, mantenerlos.

No reemplazarlos con placeholders.

---

# 42. Contenido prohibido / claims

No agregar ni reintroducir:

```text
Evaluación gratuita
Valores antiguos
Horarios antiguos
Direcciones no confirmadas
70% de recuperación
Primer centro ambulatorio de Sudamérica
Garantizamos la recuperación
Tratamiento exitoso asegurado
Autorizaciones sanitarias españolas aplicadas a Chile
Recovery 40 descrito como desintoxicación médica
```

---

# 43. Media / imágenes

Aprovechar Supabase Storage o la infraestructura existente.

El admin debe permitir:

```text
subir
reemplazar
eliminar
previsualizar
editar alt text
```

No pedir URLs manuales como flujo principal.

---

# 44. Permisos y RLS

Reutilizar roles existentes.

Lectura pública:

```text
solo contenido published
```

Admin:

```text
solo usuarios autorizados
```

Nunca exponer service role.

---

# 45. Guardado

El formulario debe permitir:

```text
Guardar borrador
Publicar
Actualizar
```

Evitar doble submit.

Mostrar estados de guardado claros.

---

# 46. Skeletons y UX admin

Mantener:

- skeletons;
- estados vacíos;
- errores claros;
- feedback de guardado;
- navegación activa;
- top bar;
- responsive.

No introducir patrones visuales distintos al admin actual.

---

# 47. SEO

Todas las páginas administrables deben soportar:

```text
title
meta description
canonical
Open Graph
alt text
```

Mantener:

```text
sitemap
robots
Google indexability
```

No romper la implementación del Blog.

---

# 48. Structured Data

Cuando corresponda:

```text
Organization
Person
BreadcrumbList
FAQPage
Article
```

Para profesionales:

```text
Person
```

No inventar credenciales.

---

# 49. Migración desde contenido actual

La implementación no debe dejar la web vacía esperando que el administrador ingrese todos los datos.

Crear una migración/seed que tome el contenido institucional actual/definido y cree:

```text
cms_pages
cms_page_sections
FAQ
Marcelo
```

Después:

```text
web pública → CMS
```

Debe verse igual o mejor inmediatamente después de la migración.

---

# 50. Gestión de secciones

No todas las páginas necesitan poder crear cualquier bloque.

Se puede definir:

```text
allowedSectionTypes
```

por `page_type`.

Ejemplo:

```text
FAQ → hero + faq + cta
Equipo → hero + team_grid + cta
Contacto → hero + pricing + contact + warning
```

---

# 51. Navegación

Mantener estabilidad.

Preferencia:

```text
ruta = controlada por sistema
label = administrable
show_in_navigation = administrable
navigation_order = administrable
```

Para páginas core, cambiar slug/ruta debe ser restringido.

---

# 52. Equipo en navegación

Cambiar cualquier navegación existente que diga:

```text
Marcelo Montiel
```

por:

```text
Equipo
```

Marcelo se accede desde:

```text
/equipo
→ tarjeta Marcelo
→ /equipo/marcelo-montiel
```

---

# 53. CTA global

Mantener visibles:

```text
Agendar evaluación
WhatsApp
```

No duplicar lógica.

Usar configuración global.

---

# 54. Accesibilidad

Público:

- H1 único;
- H2/H3 jerárquicos;
- alt;
- focus;
- labels;
- botones semánticos;
- accordions accesibles;
- contraste AA;
- reduced motion.

Admin:

- labels;
- errores asociados;
- navegación teclado;
- focus;
- alternativa accesible al drag & drop.

---

# 55. Testing

## CMS

- obtiene página publicada;
- no expone draft;
- ordena secciones;
- ignora secciones deshabilitadas;
- valida schemas;
- metadata usa fallback;
- revalidation funciona.

## Admin páginas

- lista;
- carga;
- edita;
- guarda draft;
- publica;
- reordena;
- activa/desactiva;
- validación.

## Equipo

- crear profesional;
- editar;
- publicar;
- orden;
- slug único;
- perfil público;
- ocultar draft.

## Regression

- blog sigue funcionando;
- admin noticias sigue funcionando;
- auth sigue funcionando;
- contacto sigue enviando correctamente;
- navegación mobile funciona.

---

# 56. QA

Validar páginas públicas:

```text
/
/instituto
/tratamiento
/recovery-40
/nuestro-enfoque
/familias
/equipo
/equipo/marcelo-montiel
/preguntas-frecuentes
/contacto
/blog
```

Y admin:

```text
/admin
/admin/noticias
/admin/paginas
/admin/equipo
```

Adaptar rutas a las reales.

---

# 57. Orden recomendado de trabajo

## Fase 0 — Auditoría

Crear:

```text
docs/CASTELAO_CMS_AUDIT.md
```

Con:

- estructura actual;
- admin;
- blog;
- tablas;
- auth;
- componentes reutilizables;
- riesgos;
- cambios propuestos.

## Fase 1 — Data model

- migraciones;
- RLS;
- schemas;
- tipos;
- repositories/services.

## Fase 2 — CMS Pages

- páginas;
- secciones;
- registry;
- schemas;
- rendering.

## Fase 3 — Admin Pages

- listado;
- editor;
- secciones;
- SEO;
- draft/publish;
- preview.

## Fase 4 — Equipo

- tabla/modelo;
- admin;
- `/equipo`;
- `/equipo/[slug]`;
- Marcelo.

## Fase 5 — Migración contenido

- Inicio;
- Instituto;
- Tratamiento;
- Recovery 40;
- Método;
- Familias;
- FAQ;
- Contacto.

## Fase 6 — Configuración global

- WhatsApp;
- contacto;
- CTA;
- datos reutilizables.

## Fase 7 — QA

- lint;
- typecheck;
- tests;
- build;
- audit;
- mobile;
- desktop.

---

# 58. Documentación permanente

Crear:

```text
docs/CASTELAO_CMS.md
```

y:

```text
docs/CASTELAO_CMS_STATUS.md
```

El status debe incluir:

```text
Completado
Pendiente
Páginas migradas
Equipo
Admin
Deuda técnica
Riesgos
Última validación
```

---

# 59. Criterios de aceptación

La tarea está terminada solo cuando:

## Arquitectura

- [ ] Se reutilizó el admin actual.
- [ ] Se reutilizó auth actual.
- [ ] No se creó infraestructura duplicada.
- [ ] CMS estructurado implementado.
- [ ] RLS validada.

## Páginas

- [ ] Inicio administrable.
- [ ] Instituto administrable.
- [ ] Tratamiento administrable.
- [ ] Recovery 40 administrable.
- [ ] Nuestro método administrable.
- [ ] Familias administrable.
- [ ] Equipo administrable.
- [ ] FAQ administrable.
- [ ] Contacto administrable.
- [ ] SEO administrable.

## Equipo

- [ ] `/equipo` existe.
- [ ] Marcelo ya no es item principal del menú.
- [ ] Marcelo aparece dentro del equipo.
- [ ] `/equipo/marcelo-montiel` funciona.
- [ ] nuevos profesionales pueden crearse desde admin.
- [ ] nuevos profesionales aparecen sin cambiar código.
- [ ] orden del equipo es administrable.
- [ ] estado draft/published funciona.

## Admin

- [ ] aparece módulo Páginas.
- [ ] aparece módulo Equipo.
- [ ] Noticias sigue funcionando.
- [ ] edición por bloques funciona.
- [ ] imágenes funcionan.
- [ ] SEO funciona.
- [ ] draft/publish funciona.
- [ ] formularios muestran errores correctamente.
- [ ] feedback de guardado funciona.

## Público

- [ ] contenido publicado viene de Supabase/CMS.
- [ ] contenido draft no es público.
- [ ] responsive OK.
- [ ] accesibilidad básica OK.
- [ ] CTA global funciona.
- [ ] WhatsApp funciona.
- [ ] navegación funciona.
- [ ] blog funciona.

## Calidad

- [ ] lint OK.
- [ ] typecheck OK.
- [ ] tests OK.
- [ ] build OK.
- [ ] audit revisado.

---

# 60. No hacer

- No crear un segundo admin.
- No crear otro login.
- No reinstalar Supabase.
- No romper blog/noticias.
- No crear páginas completas como HTML arbitrario.
- No hardcodear nuevamente los textos migrados.
- No permitir editar HTML/script.
- No dejar service role en cliente.
- No duplicar uploader.
- No duplicar editor rich-text.
- No crear una solución exclusiva para Marcelo.
- No exponer drafts.
- No publicar información pendiente como si estuviera confirmada.
- No inventar profesionales ni credenciales.
- No trasladar claims regulatorios españoles a Chile.
- No hacer un page builder visual innecesariamente complejo.

---

# 61. Resultado deseado

Para páginas:

```text
Entrar al panel
→ Páginas
→ Tratamiento
→ Editar texto / precio / CTA / imagen
→ Guardar
→ Vista previa
→ Publicar
→ Cambio visible en la web
```

Para profesionales:

```text
Entrar al panel
→ Equipo
→ Nuevo profesional
→ Foto + nombre + cargo + bio + SEO
→ Publicar
→ aparece en /equipo
→ perfil disponible en /equipo/[slug]
```

Sin editar código.

---

# 62. Entrega final de Codex

Al finalizar responder:

```md
## Resultado

### Auditoría inicial
...

### Arquitectura CMS
...

### Modelo de datos
...

### Páginas migradas
- Inicio:
- Instituto:
- Tratamiento:
- Recovery 40:
- Método:
- Familias:
- Equipo:
- FAQ:
- Contacto:

### Equipo
- profesionales creados:
- Marcelo:
- rutas:
- admin:

### Administrador
- módulos agregados:
- componentes reutilizados:
- editor:
- media:
- SEO:
- preview:
- permisos:

### Blog / Noticias
- estado:
- regresiones:
- validación:

### Seguridad
- RLS:
- auth:
- uploads:
- drafts:

### SEO
...

### Archivos principales modificados
...

### Migraciones
...

### Dependencias nuevas
...

### Validaciones
- lint:
- typecheck:
- tests:
- build:
- audit:

### Pendientes
...

### Riesgos
...

### Estado
GO / NO-GO
```

No indicar `GO` si:

- el blog quedó roto;
- drafts son públicos;
- el administrador perdió funcionalidades;
- `/equipo` no es administrable;
- Marcelo quedó hardcodeado;
- alguna página core sigue dependiendo de contenido provisional hardcodeado;
- build falla.

---

# 63. Principio final

El objetivo no es crear muchas pantallas de administración.

El objetivo es que **Instituto Castelao Chile pueda gestionar su contenido institucional sin depender de un desarrollador para cada cambio**, manteniendo al mismo tiempo:

- consistencia visual;
- seguridad;
- SEO;
- performance;
- estructura;
- trazabilidad;
- control editorial.

La sensación buscada es:

> “La facilidad de editar contenido de un CMS como WordPress, con la consistencia y seguridad de una aplicación moderna hecha a medida.”
