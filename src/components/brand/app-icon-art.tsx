import { BRAND } from "@/lib/brand";

/**
 * Arte de los íconos de la app para ImageResponse (Satori): solo estilos
 * inline y flexbox, sin clases ni fuentes. El trazo es el círculo central del
 * LogoMark (components/brand/logo.tsx).
 *
 * - any: squircle azul con esquinas transparentes (instalación, Android).
 * - maskable / apple: fondo a sangre navy → azul, con la marca dentro del 60%
 *   central para sobrevivir a cualquier máscara (círculo, gota, squircle de iOS).
 */
export type AppIconVariant = "any" | "maskable" | "apple";

const NAVY = "#0d2557";

export function AppIconArt({ size, variant }: { size: number; variant: AppIconVariant }) {
  if (variant === "any") {
    return (
      <div style={{ display: "flex", width: size, height: size }}>
        <div
          style={{
            display: "flex",
            width: size,
            height: size,
            borderRadius: Math.round(size * 0.275),
            backgroundImage: `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.blueDeep} 100%)`,
          }}
        >
          <LogoMarkSvg size={size} />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        width: size,
        height: size,
        backgroundColor: BRAND.bg,
        backgroundImage: `linear-gradient(135deg, ${BRAND.bg} 0%, ${NAVY} 45%, ${BRAND.blueDeep} 100%)`,
      }}
    >
      <FullBleedMarkSvg size={size} />
    </div>
  );
}

/** Mismos trazos que LogoMark, para el squircle. */
function LogoMarkSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M20 3v34" stroke="white" strokeOpacity="0.35" strokeWidth="1.6" />
      <circle cx="20" cy="20" r="8.5" fill="none" stroke="white" strokeWidth="2.4" />
      <circle cx="20" cy="20" r="2.4" fill="white" />
      <path d="M1 14h5.5v12H1" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="1.6" />
      <path d="M39 14h-5.5v12H39" fill="none" stroke="white" strokeOpacity="0.35" strokeWidth="1.6" />
    </svg>
  );
}

/**
 * Versión a sangre: la línea media y las áreas cruzan todo el lienzo como en
 * una cancha; el círculo central (Ø 54%) queda dentro de la zona segura.
 */
function FullBleedMarkSvg({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M20 0v40" stroke="white" strokeOpacity="0.28" strokeWidth="1.2" />
      <path d="M0 13.5h4.5v13H0" fill="none" stroke="white" strokeOpacity="0.28" strokeWidth="1.2" />
      <path d="M40 13.5h-4.5v13H40" fill="none" stroke="white" strokeOpacity="0.28" strokeWidth="1.2" />
      <circle cx="20" cy="20" r="9.5" fill="none" stroke="white" strokeWidth="2.6" />
      <circle cx="20" cy="20" r="2.6" fill="white" />
    </svg>
  );
}
