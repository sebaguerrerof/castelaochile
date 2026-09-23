# Instituto Castelao Chile

MVP institucional de una sola página para Instituto Castelao Chile. Está construido con Next.js App Router, React, TypeScript estricto, Tailwind CSS v4, componentes reutilizables inspirados en shadcn/ui, Radix Accordion y Lucide.

## Requisitos

- Node.js 22.6 o posterior.
- pnpm 11 o posterior.

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
- Navegación por anclas: `src/config/navigation.ts`
- Assets públicos aprobados: `src/config/assets.ts`
- Copy y tarjetas: `src/content/home.ts`, `src/content/faq.ts`
- Variantes de botón: `src/components/ui/button.tsx`

Consulta `docs/DESIGN_SYSTEM.md`, `docs/CONTENT_AND_ASSETS.md` y `docs/RELEASE_CHECKLIST.md` antes de incorporar contenido o publicar.
