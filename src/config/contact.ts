import type { ContactConfig } from "@/types/site";

// Replace only confirmed Chilean data here. Components consume this contract
// through the contact helpers, so no contact data is duplicated in the UI.
export const contactConfig: ContactConfig = {
  phone: null,
  whatsapp: "+56938650977",
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

/** Optional prefilled copy shared by WhatsApp entry points when it is configured. */
export const whatsappGreeting = contactConfig.whatsappGreeting;
