export type LocalImageAsset = {
  src: `/images/${string}`;
  alt: string;
  width: number;
  height: number;
  objectPosition: string;
};

export type LocalBrandAsset = {
  src: `/brand/${string}`;
  alt: string;
  width: number;
  height: number;
  status: "manual-derived-preview";
};

/**
 * Single source for public local assets. The four photos are optimized copies
 * intended for local review only; their publishing approval remains pending.
 * The horizontal mark is an unmodified high-resolution crop of the official
 * art on page 6 of the supplied manual, not a replacement master file.
 */
export const assets = {
  brand: {
    horizontal: {
      src: "/brand/instituto-castelao-horizontal-manual-preview.png",
      alt: "Logotipo Instituto Castelao",
      width: 2880,
      height: 595,
      status: "manual-derived-preview",
    } satisfies LocalBrandAsset,
  },
  images: {
    hero: {
      src: "/images/hero-sala-luminosa.webp",
      alt: "Sala luminosa con sillas y ventanales del Instituto Castelao",
      width: 1026,
      height: 1280,
      objectPosition: "50% 50%",
    } satisfies LocalImageAsset,
    institute: {
      src: "/images/instituto-sala-azul.webp",
      alt: "Interior de una sala azul del Instituto Castelao",
      width: 1086,
      height: 1448,
      objectPosition: "50% 42%",
    } satisfies LocalImageAsset,
    accompaniment: {
      src: "/images/acompanamiento-sala-grupal.webp",
      alt: "Sala preparada con sillas para un espacio de conversación",
      width: 1200,
      height: 1600,
      objectPosition: "50% 48%",
    } satisfies LocalImageAsset,
    contact: {
      src: "/images/contacto-sala-de-espera.webp",
      alt: "Sala de espera con luz natural y plantas",
      width: 1086,
      height: 1448,
      objectPosition: "50% 50%",
    } satisfies LocalImageAsset,
  },
} as const;
