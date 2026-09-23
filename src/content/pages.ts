import { assets, type LocalImageAsset } from "@/config/assets";

export type InstitutionalPage = {
  path: "/instituto" | "/acompanamiento" | "/nuestro-enfoque" | "/familias" | "/preguntas-frecuentes" | "/contacto";
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  image: LocalImageAsset;
  variant: "blue" | "mist" | "warm";
};

export const institutionalPages = {
  institute: {
    path: "/instituto",
    label: "Instituto",
    eyebrow: "Instituto Castelao Chile",
    title: "Un espacio institucional construido con cuidado",
    description:
      "Presentamos la información disponible de Instituto Castelao Chile con un compromiso sencillo: comunicar solo aquello que ha sido confirmado localmente.",
    image: assets.images.institute,
    variant: "mist",
  },
  accompaniment: {
    path: "/acompanamiento",
    label: "Acompañamiento",
    eyebrow: "Orientación general",
    title: "Acompañar comienza por comprender el contexto",
    description:
      "Esta sección ofrece información general para acercarse a una conversación de orientación sin sustituir una evaluación individual.",
    image: assets.images.accompaniment,
    variant: "blue",
  },
  approach: {
    path: "/nuestro-enfoque",
    label: "Nuestro enfoque",
    eyebrow: "Forma de trabajar",
    title: "Una comunicación clara, respetuosa y sin etiquetas",
    description:
      "El enfoque editorial del sitio pone a las personas y sus contextos antes que las respuestas rápidas o las promesas.",
    image: assets.images.hero,
    variant: "warm",
  },
  families: {
    path: "/familias",
    label: "Familias",
    eyebrow: "Personas cercanas",
    title: "También hay preguntas para quienes acompañan",
    description:
      "Un espacio breve para encontrar orientación general y conversar desde el respeto por los ritmos de cada persona.",
    image: assets.images.contact,
    variant: "mist",
  },
  faq: {
    path: "/preguntas-frecuentes",
    label: "Preguntas frecuentes",
    eyebrow: "Información institucional",
    title: "Respuestas claras desde el inicio",
    description:
      "Reunimos las preguntas más frecuentes sobre el alcance de esta presencia digital y sus límites actuales.",
    image: assets.images.institute,
    variant: "blue",
  },
  contact: {
    path: "/contacto",
    label: "Contacto",
    eyebrow: "Contacto Chile",
    title: "Una vía de contacto preparada con responsabilidad",
    description:
      "El formulario está disponible para revisar la experiencia, pero los canales institucionales se activarán solo cuando estén confirmados.",
    image: assets.images.contact,
    variant: "warm",
  },
} as const satisfies Record<string, InstitutionalPage>;

export const homePageLinks = [
  {
    href: institutionalPages.institute.path,
    anchor: "instituto",
    eyebrow: "01 · Instituto",
    title: "Conoce el instituto",
    description: "El propósito editorial y los principios que guían esta presencia digital.",
  },
  {
    href: institutionalPages.accompaniment.path,
    anchor: "acompanamiento",
    eyebrow: "02 · Orientación",
    title: "Explora el acompañamiento",
    description: "Información general para comenzar a comprender el alcance de esta conversación.",
  },
  {
    href: institutionalPages.approach.path,
    anchor: "como-trabajamos",
    eyebrow: "03 · Enfoque",
    title: "Nuestro enfoque",
    description: "Una forma de comunicar con escucha, privacidad y lenguaje no estigmatizante.",
  },
  {
    href: institutionalPages.families.path,
    anchor: "familias",
    eyebrow: "04 · Familias",
    title: "Para personas cercanas",
    description: "Un punto de partida editorial para quienes tienen preguntas y buscan orientación.",
  },
  {
    href: institutionalPages.faq.path,
    anchor: "preguntas-frecuentes",
    eyebrow: "05 · FAQ",
    title: "Preguntas frecuentes",
    description: "Respuestas transparentes sobre el sitio, la información publicada y sus límites.",
  },
  {
    href: institutionalPages.contact.path,
    anchor: "contacto",
    eyebrow: "06 · Contacto",
    title: "Revisa el contacto",
    description: "Conoce el formulario de demostración y el estado de los canales oficiales.",
  },
] as const;