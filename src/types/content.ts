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

export type FaqItem = {
  id: string;
  question: string;
  answer: string;
  approval: "editorial" | "pending-validation";
};
