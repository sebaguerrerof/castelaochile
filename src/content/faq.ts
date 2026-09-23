import type { FaqItem } from "@/types/content";

export const faqItems: readonly FaqItem[] = [
  {
    id: "informacion",
    question: "¿Qué información puedo encontrar en este sitio?",
    answer:
      "Información institucional general sobre el enfoque editorial de Instituto Castelao Chile. No contiene diagnósticos ni indicaciones para casos individuales.",
    approval: "editorial",
  },
  {
    id: "reservas",
    question: "¿Puedo reservar una atención desde la web?",
    answer:
      "No. Este sitio no agenda atenciones. El formulario de primer contacto se habilitará únicamente cuando estén confirmados el buzón institucional y el flujo de privacidad correspondiente.",
    approval: "editorial",
  },
  {
    id: "servicios",
    question: "¿Qué servicios están disponibles en Chile?",
    answer:
      "Las prestaciones y modalidades específicas para Chile están pendientes de validación institucional y no se publican en esta etapa.",
    approval: "pending-validation",
  },
  {
    id: "equipo",
    question: "¿Dónde puedo conocer al equipo?",
    answer:
      "La información sobre integrantes, roles y credenciales se incorporará únicamente después de contar con autorización institucional para su publicación.",
    approval: "pending-validation",
  },
  {
    id: "urgencia",
    question: "¿Este sitio atiende situaciones de urgencia?",
    answer:
      "No. Este sitio no es un canal de urgencias. Ante una situación inmediata, busca apoyo a través de los servicios de emergencia o de salud disponibles en tu localidad.",
    approval: "editorial",
  },
];
