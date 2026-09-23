import type { FaqItem } from "@/types/content";

export const faqTopics = [
  { id: "sitio", eyebrow: "El sitio", title: "Alcance de esta información" },
  { id: "contacto", eyebrow: "Contacto", title: "Canales y próximos pasos" },
  { id: "orientacion", eyebrow: "Orientación", title: "Cuando surgen dudas" },
] as const;

export const faqItems: readonly FaqItem[] = [
  {
    id: "informacion",
    topic: "sitio",
    question: "¿Qué información puedo encontrar en este sitio?",
    answer:
      "Información institucional general sobre el enfoque editorial de Instituto Castelao Chile. No contiene diagnósticos ni indicaciones para casos individuales.",
    approval: "editorial",
  },
  {
    id: "servicios",
    topic: "sitio",
    question: "¿Qué servicios están disponibles en Chile?",
    answer:
      "Las prestaciones y modalidades específicas para Chile están pendientes de validación institucional y no se publican en esta etapa.",
    approval: "pending-validation",
  },
  {
    id: "reservas",
    topic: "contacto",
    question: "¿Puedo reservar una atención desde la web?",
    answer:
      "No. Este sitio no agenda atenciones. El formulario se presenta solo como demostración y no envía ni guarda consultas mientras se completa el flujo institucional de privacidad.",
    approval: "editorial",
  },
  {
    id: "equipo",
    topic: "contacto",
    question: "¿Dónde puedo conocer al equipo?",
    answer:
      "La información sobre integrantes, roles y credenciales se incorporará únicamente después de contar con autorización institucional para su publicación.",
    approval: "pending-validation",
  },
  {
    id: "urgencia",
    topic: "orientacion",
    question: "¿Este sitio atiende situaciones de urgencia?",
    answer:
      "No. Este sitio no es un canal de urgencias. Ante una situación inmediata, busca apoyo a través de los servicios de emergencia o de salud disponibles en tu localidad.",
    approval: "editorial",
  },
];