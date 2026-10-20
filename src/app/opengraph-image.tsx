import { ImageResponse } from "next/og";
import { AppIconArt } from "@/components/brand/app-icon-art";
import { BRAND, BRAND_TAGLINE } from "@/lib/brand";

/** Imagen para compartir (WhatsApp, redes). Estática: se genera en el build. */
export const alt = "FulBot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const CIRCLE = 460;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          color: "#eef2f8",
          backgroundColor: BRAND.bg,
          backgroundImage: "radial-gradient(circle at 50% 0%, rgba(52, 145, 255, 0.38) 0%, rgba(5, 10, 21, 0) 62%)",
        }}
      >
        {/* Línea media y círculo central de la cancha, muy sutiles. */}
        <div
          style={{
            position: "absolute",
            left: size.width / 2 - 1,
            top: 0,
            width: 2,
            height: size.height,
            backgroundColor: "rgba(255, 255, 255, 0.05)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: (size.width - CIRCLE) / 2,
            top: (size.height - CIRCLE) / 2,
            width: CIRCLE,
            height: CIRCLE,
            borderRadius: CIRCLE,
            border: "2px solid rgba(255, 255, 255, 0.05)",
          }}
        />
        <AppIconArt size={148} variant="any" />
        <div style={{ display: "flex", marginTop: 40, fontSize: 120, lineHeight: 1, fontWeight: 700, letterSpacing: -2 }}>
          <span>Fut</span>
          <span style={{ color: BRAND.blue }}>Bot</span>
        </div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 40, color: "#97a3b6" }}>{BRAND_TAGLINE}</div>
      </div>
    ),
    size,
  );
}
