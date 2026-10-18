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
