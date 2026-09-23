export type ContactConfig = {
  phone: string | null;
  whatsapp: string | null;
  whatsappGreeting?: string;
  email: string | null;
  streetAddress: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  openingHours: string | null;
  mapsUrl: string | null;
  socialLinks: {
    instagram: string | null;
    facebook: string | null;
    linkedin: string | null;
  };
};

export type NavigationItem = {
  href: `#${string}`;
  label: string;
};

export type ContactAction = {
  href: string;
  icon: "phone" | "message" | "mail" | "map";
  label: string;
};
