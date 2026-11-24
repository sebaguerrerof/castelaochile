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
  status: "manual-extracted";
};

/**
 * Single source for public local assets. The four photos are optimized copies
 * intended for local review only; their publishing approval remains pending.
 * The logos are the original raster art embedded in the supplied brand manual
 * (pages 5 and 6), extracted at native resolution with their transparency and
 * with only the empty transparent margin trimmed. They are not redrawn or
 * recolored; replace them if the agency supplies vector masters.
 */
export const assets = {
  brand: {
    horizontal: {
      src: "/brand/instituto-castelao-horizontal.png",
      alt: "Logotipo Instituto Castelao",
      width: 2669,
      height: 357,
      status: "manual-extracted",
    } satisfies LocalBrandAsset,
    mark: {
      src: "/brand/instituto-castelao-mano.png",
      alt: "",
      width: 570,
      height: 656,
      status: "manual-extracted",
    } satisfies LocalBrandAsset,
    /** "Negativo / sobre fondo azul corporativo" (manual p. 16): white artwork, the eye stays transparent. */
    verticalNegative: {
      src: "/brand/instituto-castelao-vertical-negativo.png",
      alt: "Logotipo Instituto Castelao",
      width: 1409,
      height: 765,
      status: "manual-extracted",
    } satisfies LocalBrandAsset,
    vertical: {
      src: "/brand/instituto-castelao-vertical.png",
      alt: "Logotipo Instituto Castelao",
      width: 1754,
      height: 913,
      status: "manual-extracted",
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
