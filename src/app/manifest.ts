import type { MetadataRoute } from "next";
import { BRAND, BRAND_DESCRIPTION } from "@/lib/brand";
import { routes } from "@/lib/routes";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: BRAND.name,
    short_name: BRAND.shortName,
    description: BRAND_DESCRIPTION,
    lang: "es-AR",
    dir: "ltr",
    // Abre en el último grupo visitado (ver src/app/abrir/route.ts).
    start_url: routes.launch,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BRAND.bg,
    theme_color: BRAND.bg,
    categories: ["sports", "social"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    launch_handler: { client_mode: ["navigate-existing", "auto"] },
  };
}
