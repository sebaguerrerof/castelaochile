import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Instituto Castelao Chile",
    short_name: "Castelao Chile",
    lang: "es-CL",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f8fa",
    theme_color: "#0079BE",
    icons: [192, 512].map(size => ({ src: `/icon/${size}`, sizes: `${size}x${size}`, type: "image/png", purpose: "any" })),
  };
}
