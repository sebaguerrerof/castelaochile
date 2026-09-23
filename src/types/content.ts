import type { LucideIcon } from "lucide-react";

export type TreatmentCardContent = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type ValueCardContent = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type FaqTopic = "sitio" | "contacto" | "orientacion";

export type FaqItem = {
  id: string;
  topic: FaqTopic;
  question: string;
  answer: string;
  approval: "editorial" | "pending-validation";
};