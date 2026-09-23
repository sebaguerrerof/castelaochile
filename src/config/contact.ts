import type { ContactConfig } from "@/types/site";

// Replace only confirmed Chilean data here. Components consume this contract
// through the contact helpers, so no contact data is duplicated in the UI.
export const contactConfig: ContactConfig = {
  phone: null,
  whatsapp: null,
  whatsappGreeting: "Hola, quisiera recibir información sobre Instituto Castelao Chile.",
  email: null,
  streetAddress: null,
  city: null,
  region: null,
  country: null,
  openingHours: null,
  mapsUrl: null,
  socialLinks: {
    instagram: null,
    facebook: null,
    linkedin: null,
  },
};

/** Neutral copy shared by the floating action and the contextual contact links. */
export const whatsappGreeting = contactConfig.whatsappGreeting;
