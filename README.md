# Instituto Castelao Chile

Web institucional multipágina para Instituto Castelao Chile, con CMS, Equipo, perfiles profesionales y Blog/Noticias administrados en Supabase. Está construido con Next.js App Router, React, TypeScript estricto, Tailwind CSS v4, Radix Accordion y Lucide. Público y vistas previas del administrador comparten componentes y sistema visual.

## Requisitos

- Node.js 22.12 o posterior.
- pnpm compatible con el lockfile; versión verificada: 10.12.1.

## Ejecutar localmente

```bash
pnpm install
pnpm dev
```

Abre `http://localhost:3000`.

## Verificaciones

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Cambios globales

- Tema y tokens: `src/app/globals.css`
- Marca, dominio y metadata: `src/config/site.ts`
- Canales locales confirmados: `src/config/contact.ts`
- Navegación publicada del CMS y agrupación del header: `src/lib/cms/repository.ts`, `src/lib/public-navigation.ts`
- Assets públicos aprobados: `src/config/assets.ts`
- Contenido institucional, fotografías y tarjetas: administrador `/admin/paginas` y `/admin/equipo`
- Sistema visual público: `src/app/(public)/public-design.css`
- Variantes de botón: `src/components/ui/button.tsx`

Consulta [operación del CMS](docs/CASTELAO_CMS.md), [estado del CMS](docs/CASTELAO_CMS_STATUS.md) y [sistema visual público](docs/PUBLIC_DESIGN_SYSTEM.md). Las condiciones editoriales y de contacto siguen documentadas en `docs/CONTENT_AND_ASSETS.md` y `docs/RELEASE_CHECKLIST.md`; estos registros incluyen fases anteriores.
