import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Solo en desarrollo: permite abrir el servidor desde el celular en la red local
  // (http://<IP-de-la-PC>:3000). No afecta al build de producción.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Detecta cortes de conexión, reintenta navegaciones y Server Actions al volver
    // la señal y habilita useOffline() (next/offline) para el aviso "Sin conexión".
    useOffline: true,
  },
  // El service worker de los avisos (public/sw.js) se revisa siempre: así cada
  // deploy lo actualiza sin esperar a que venza una caché.
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
