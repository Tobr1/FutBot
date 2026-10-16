import { initials } from "@/domain/names/normalize";
import { cn } from "@/lib/utils";

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
} as const;

/** Tono estable por nombre para que cada jugador tenga "su" color. */
function hueFor(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}

export function UserAvatar({
  name,
  src,
  size = "md",
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const hue = hueFor(name);
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-display font-bold text-white ring-1 ring-white/10 select-none",
        SIZES[size],
        className,
      )}
      style={{ background: `linear-gradient(135deg, oklch(0.55 0.14 ${hue}), oklch(0.38 0.12 ${(hue + 40) % 360}))` }}
    >
      {src ? (
        // Avatares ya redimensionados al subir; no hace falta el optimizador.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <span aria-hidden="true">{initials(name)}</span>
      )}
      <span className="sr-only">{name}</span>
    </span>
  );
}
