import {
  BookOpenCheck,
  CircleHelp,
  HeartHandshake,
  MessageCircleHeart,
  Scale,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from "lucide-react";

import type { TreatmentCardContent, ValueCardContent } from "@/types/content";

export const homeContent = {
  hero: {
    eyebrow: "Instituto Castelao · Chile",
    title: "Acompañamiento en el proceso de recuperación",
    description:
      "Conoce el enfoque institucional de Instituto Castelao Chile. La información de servicios y vías de contacto se incorporará a medida que sea validada localmente.",
    cta: { label: "Conoce nuestro enfoque", href: "/nuestro-enfoque" },
  },
  about: {
    eyebrow: "Instituto",
    title: "Un espacio para escuchar antes de avanzar",
    description:
      "Instituto Castelao Chile prepara una presencia digital clara, respetuosa y cercana. Este sitio reúne información general y será actualizado con contenidos locales verificados.",
    quote:
      "Cada historia requiere escucha, respeto y una mirada atenta a la realidad de cada persona.",
  },
  accompaniment: {
    eyebrow: "Información general",
    title: "Tratamiento y acompañamiento",
    description:
      "Presentamos categorías informativas de forma general. Las modalidades, prestaciones y equipos específicos para Chile se publicarán solo tras validación institucional.",
    note:
      "La información de este sitio es orientativa y no reemplaza una evaluación profesional individual.",
  },
  values: {
    eyebrow: "Cómo trabajamos",
    title: "Una mirada centrada en las personas",
    description:
      "Los principios editoriales que guían esta presencia institucional privilegian un lenguaje cuidadoso y sin estigmas.",
  },
  contact: {
    eyebrow: "Contacto Chile",
    title: "Una vía de contacto clara y cuidadosa",
    description:
      "Esta sección está preparada para un primer mensaje institucional. Los canales y el envío público se activarán solo cuando hayan sido confirmados por Instituto Castelao Chile.",
  },
  footerNotice:
    "La información de este sitio es de carácter general y no sustituye una evaluación profesional individual.",
} as const;

export const treatmentCards: readonly TreatmentCardContent[] = [
  {
    id: "alcohol",
    title: "Alcohol",
    description:
      "Información general para comprender que cada situación puede requerir orientación individual y contexto propio.",
    icon: BookOpenCheck,
  },
  {
    id: "otras-sustancias",
    title: "Otras sustancias",
    description:
      "Contenido institucional de carácter orientativo, sin diagnósticos ni promesas sobre prestaciones locales.",
    icon: CircleHelp,
  },
  {
    id: "entorno-cercano",
    title: "Entorno cercano",
    description:
      "Una sección informativa pensada para abordar el proceso con respeto por las personas y sus redes de apoyo.",
    icon: UsersRound,
  },
];

export const valueCards: readonly ValueCardContent[] = [
  {
    id: "escucha",
    title: "Escucha",
    description:
      "Ponemos atención a las preguntas, contextos y ritmos de cada persona, sin reducir las experiencias a etiquetas.",
    icon: MessageCircleHeart,
  },
  {
    id: "respeto",
    title: "Respeto",
    description:
      "Cuidamos un tono humano, claro y no estigmatizante en cada contenido institucional.",
    icon: HeartHandshake,
  },
  {
    id: "individualizacion",
    title: "Individualización",
    description:
      "Evitamos soluciones universales: la información se presenta como orientación general, no como una respuesta única.",
    icon: Scale,
  },
  {
    id: "privacidad",
    title: "Privacidad",
    description:
      "El primer contacto pide solo datos básicos para responder. No solicites ni compartas antecedentes de salud en este formulario.",
    icon: ShieldCheck,
  },
];

export const editorialBadge = {
  icon: Sparkles,
  label: "Contenido institucional",
};
