import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Sección planificada para más adelante (docs/ANALISIS.md §8): chip
 * "Muy pronto", lo que va a traer y, opcionalmente, una vista previa
 * atenuada e inerte de cómo se va a ver.
 */
export function ComingSoon({
  icon: Icon,
  title,
  description,
  items,
  preview,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  items: string[];
  /** Vista previa decorativa (fantasma); se muestra atenuada y sin interacción. */
  preview?: ReactNode;
  /** @deprecated Se ignora: la UI ya no muestra fases del roadmap. */
  phase?: string;
  className?: string;
}) {
  return (
    <section className={cn("panel overflow-hidden rounded-2xl", className)}>
      {preview && (
        <div
          inert
          aria-hidden="true"
          className="pointer-events-none px-4 pt-4 opacity-50 select-none [mask-image:linear-gradient(to_bottom,black_40%,transparent)]"
        >
          {preview}
        </div>
      )}
      <div className={cn("space-y-3 p-5", preview && "pt-3")}>
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <span className="inline-flex h-6 items-center rounded-full bg-primary/15 px-2.5 text-xs font-semibold text-primary">
            Muy pronto
          </span>
        </div>
        <div className="space-y-1">
          <h2 className="font-display text-display-md font-extrabold tracking-wide uppercase">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        <ul className="space-y-2 text-sm">
          {items.map((item) => (
            <li key={item} className="flex items-start gap-2.5">
              <span aria-hidden="true" className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-primary/60" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
