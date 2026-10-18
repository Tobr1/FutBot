import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Encabezado de página en una sola fila: título a la izquierda, acciones a la
 * derecha. El h1 lleva id="page-title" para que StackHeader sepa cuándo
 * mostrar el título compacto al hacer scroll.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  id = "page-title",
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <header className={cn("flex items-end justify-between gap-3", className)}>
      <div className="min-w-0 space-y-1">
        {eyebrow && <p className="text-2xs font-semibold tracking-[0.12em] text-primary uppercase">{eyebrow}</p>}
        <h1
          id={id}
          className="font-display text-display-lg font-extrabold tracking-wide wrap-break-word uppercase sm:text-4xl sm:leading-[0.95]"
        >
          {title}
        </h1>
        {description && (
          <p className="line-clamp-2 max-w-2xl text-sm text-muted-foreground sm:line-clamp-none">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
