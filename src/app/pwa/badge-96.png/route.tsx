import { ImageResponse } from "next/og";

/**
 * Ícono chico de los avisos (barra de estado de Android). El sistema usa solo
 * la transparencia, así que va en blanco sobre fondo transparente.
 */
export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            border: "9px solid white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: 50,
            fontWeight: 800,
          }}
        >
          F
        </div>
      </div>
    ),
    { width: 96, height: 96 },
  );
}
