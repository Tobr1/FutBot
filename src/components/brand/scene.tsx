import Image, { type StaticImageData } from "next/image";
import cancha from "@/assets/escenas/cancha.webp";
import heroFulbot from "@/assets/escenas/hero-fulbot.webp";
import heroGrupo from "@/assets/escenas/hero-grupo.webp";
import heroPartidos from "@/assets/escenas/hero-partidos.webp";
import inicio from "@/assets/escenas/inicio.webp";
import luces from "@/assets/escenas/luces.webp";
import mas from "@/assets/escenas/mas.webp";
import partidos from "@/assets/escenas/partidos.webp";
import plantel from "@/assets/escenas/plantel.webp";
import rankings from "@/assets/escenas/rankings.webp";
import { cn } from "@/lib/utils";

/*
 * Escenas de fondo: imágenes conceptuales (generadas por IA, sin texto) que
 * solo decoran. Nunca se presentan como fotos reales del grupo, por eso van
 * con alt vacío. `position` encuadra lo importante al recortar en el celular.
 */
const SCENES = {
  "hero-fulbot": { src: heroFulbot, position: "30% 60%" },
  "hero-grupo": { src: heroGrupo, position: "25% 55%" },
  "hero-partidos": { src: heroPartidos, position: "30% 45%" },
  inicio: { src: inicio, position: "50% 55%" },
  partidos: { src: partidos, position: "50% 45%" },
  plantel: { src: plantel, position: "75% 30%" },
  rankings: { src: rankings, position: "80% 60%" },
  mas: { src: mas, position: "40% 60%" },
  cancha: { src: cancha, position: "50% 60%" },
  luces: { src: luces, position: "75% 35%" },
} satisfies Record<string, { src: StaticImageData; position: string }>;

export type SceneKey = keyof typeof SCENES;

/**
 * Imagen de escena que llena a su contenedor (que tiene que ser `relative` y
 * `overflow-hidden`). Decorativa: alt vacío y fuera del árbol de accesibilidad.
 */
export function SceneImage({
  scene,
  sizes = "100vw",
  eager = false,
  className,
}: {
  scene: SceneKey;
  /** Ancho real en pantalla, para que el navegador baje la versión justa. */
  sizes?: string;
  /** Imagen principal de la pantalla (arriba de todo): se pide ya y con prioridad. */
  eager?: boolean;
  className?: string;
}) {
  const { src, position } = SCENES[scene];
  return (
    <Image
      src={src}
      alt=""
      aria-hidden="true"
      fill
      sizes={sizes}
      placeholder="blur"
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : "auto"}
      draggable={false}
      className={cn("pointer-events-none object-cover select-none", className)}
      style={{ objectPosition: position }}
    />
  );
}
