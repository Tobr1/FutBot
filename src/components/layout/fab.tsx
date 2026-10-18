import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Botón flotante extendido (ícono + texto) para la acción principal de una
 * pantalla en mobile. Flota sobre la barra inferior; en escritorio se oculta
 * y la acción vive en el encabezado de la página.
 */
export function Fab({
  href,
  icon: Icon,
  label,
  transitionTypes = ["nav-forward"],
  className,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  transitionTypes?: string[];
  className?: string;
}) {
  return (
    <Link
      href={href}
      transitionTypes={transitionTypes}
      className={cn(
        "app-chrome pressable fixed right-4 bottom-[var(--float-bottom)] z-30 inline-flex h-14 items-center gap-2 rounded-2xl bg-primary-solid px-5 font-semibold text-primary-foreground shadow-glow lg:hidden",
        className,
      )}
    >
      <Icon className="size-5 shrink-0" strokeWidth={2.25} aria-hidden="true" />
      <span>{label}</span>
    </Link>
  );
}
