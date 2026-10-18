import { initials } from "@/domain/names/normalize";
import { hueFor } from "@/lib/color";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: { box: "size-6", text: "text-2xs" },
  sm: { box: "size-7", text: "text-xs" },
  md: { box: "size-10", text: "text-sm" },
  lg: { box: "size-16", text: "text-2xl" },
} as const;

export type GroupCrestSize = keyof typeof SIZES;

/**
 * Escudo del grupo: forma de escudo, degradado con el tono del nombre,
 * iniciales en Barlow y el círculo central de la cancha. Es decorativo:
 * el nombre del grupo siempre aparece como texto al lado.
 */
export function GroupCrest({ name, size = "md", className }: { name: string; size?: GroupCrestSize; className?: string }) {
  const hue = hueFor(name);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative isolate inline-grid shrink-0 place-items-center overflow-hidden rounded-[28%_28%_46%_46%] ring-1 ring-white/15 ring-inset select-none",
        SIZES[size].box,
        className,
      )}
      style={{ background: `linear-gradient(160deg, oklch(0.58 0.15 ${hue}), oklch(0.36 0.12 ${(hue + 40) % 360}))` }}
    >
      <span className="absolute inset-0 m-auto size-[70%] rounded-full border border-white/10" />
      <span className={cn("relative font-display leading-none font-extrabold text-white", SIZES[size].text)}>{initials(name)}</span>
    </span>
  );
}
