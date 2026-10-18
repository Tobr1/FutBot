"use client";

import { useEffect } from "react";
import { BRAND } from "@/lib/brand";

/**
 * Reemplaza al root layout cuando falla, así que no tiene globals.css ni
 * fuentes: todo va con estilos inline.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error instanceof Error ? error : new Error(String(error)));
  }, [error]);

  return (
    <html lang="es-AR" className="dark">
      <body
        style={{
          margin: 0,
          background: BRAND.bg,
          color: "#eef2f8",
          colorScheme: "dark",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
          WebkitFontSmoothing: "antialiased",
        }}
      >
        <title>{`Algo salió mal · ${BRAND.name}`}</title>
        <main
          style={{
            minHeight: "100dvh",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
            padding: "max(2rem, env(safe-area-inset-top)) 1.5rem max(2rem, env(safe-area-inset-bottom))",
            textAlign: "center",
          }}
        >
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: 1.1, fontWeight: 800, letterSpacing: "0.02em", textTransform: "uppercase" }}>
            Algo salió mal
          </h1>
          <p style={{ margin: 0, maxWidth: 320, fontSize: 15, lineHeight: 1.5, color: "#97a3b6" }}>
            La app tuvo un problema inesperado. Probá de nuevo en un toque.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              marginTop: 12,
              minHeight: 48,
              padding: "0 24px",
              border: 0,
              borderRadius: 12,
              background: BRAND.blueDeep,
              color: "#ffffff",
              fontSize: 16,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
              touchAction: "manipulation",
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
