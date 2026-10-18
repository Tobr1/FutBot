import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "primary" | "gold";

const TILE: Record<Tone, string> = {
  neutral: "bg-surface-3 text-muted-foreground ring-hairline",
  primary: "bg-primary/12 text-primary ring-primary/25",
  gold: "bg-gold/12 text-gold ring-gold/25",
};

const GLOW: Record<Tone, string> = {
  neutral: "",
  primary: "bg-[radial-gradient(120%_80%_at_50%_0%,oklch(0.66_0.19_256/10%),transparent_60%)]",
  gold: "bg-[radial-gradient(120%_80%_at_50%_0%,oklch(0.84_0.13_88/10%),transparent_60%)]",
};

/**
 * Estado vacío. `md`/`lg` es un bloque centrado con ícono; `sm` es una fila
 * compacta (ícono, texto y acción a la derecha) para secciones secundarias.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "md",
  tone = "primary",
  headingLevel = "h3",
  art,
}: {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg";
  tone?: Tone;
  headingLevel?: "h1" | "h2" | "h3";
  /** Ilustración propia; reemplaza al ícono. */
  art?: ReactNode;
}) {
  const Heading = headingLevel;

  if (size === "sm") {
    return (
      <div className={cn("panel flex items-center gap-3 rounded-xl p-4 text-left", className)}>
        {(art || Icon) && (
          <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg ring-1", TILE[tone])}>
            {art ?? (Icon && <Icon className="size-[18px]" aria-hidden="true" />)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <Heading className="text-sm font-semibold">{title}</Heading>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    );
  }

  const large = size === "lg";
  return (
    <div
      className={cn(
        "panel flex flex-col items-center gap-4 rounded-2xl px-6 text-center",
        large ? "py-14 lg:py-20" : "py-10 lg:py-14",
        GLOW[tone],
        className,
      )}
    >
      {art ??
        (Icon && (
          <span
            className={cn("grid place-items-center rounded-2xl ring-1", large ? "size-16" : "size-14", TILE[tone])}
          >
            <Icon className={large ? "size-8" : "size-7"} aria-hidden="true" />
          </span>
        ))}
      <div className="max-w-sm space-y-1.5">
        <Heading
          className={cn("font-display font-extrabold tracking-wide uppercase", large ? "text-2xl leading-none" : "text-xl leading-none")}
        >
          {title}
        </Heading>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
