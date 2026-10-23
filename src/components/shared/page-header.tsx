import type { ReactNode } from "react";
import { type SceneKey, SceneImage } from "@/components/brand/scene";
import { cn } from "@/lib/utils";

/**
 * Encabezado de página en una sola fila: título a la izquierda, acciones a la
 * derecha. El h1 lleva id="page-title" para que StackHeader sepa cuándo
 * mostrar el título compacto al hacer scroll.
 *
 * Con `scene`, el encabezado va sobre una imagen de fondo (portada de las
 * secciones principales): en el celular ocupa todo el ancho, y dos degradés
 * oscurecen abajo y a la izquierda para que el texto siempre se lea.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  id = "page-title",
  scene,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
  id?: string;
  scene?: SceneKey;
}) {
  const header = (
    <header className={cn("relative flex items-end justify-between gap-3", !scene && className)}>
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
  if (!scene) return header;

  return (
    <div
      className={cn(
        "relative -mx-4 -mt-4 overflow-hidden px-4 pt-24 pb-4",
        "lg:mx-0 lg:mt-0 lg:rounded-2xl lg:px-6 lg:pt-32 lg:pb-6 lg:ring-1 lg:ring-hairline",
        className,
      )}
    >
      <SceneImage scene={scene} sizes="(min-width: 1024px) 1024px, 100vw" eager />
      <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-background via-background/65 to-background/5" />
      <span aria-hidden="true" className="absolute inset-0 bg-linear-to-r from-background/75 via-background/25 to-transparent" />
      {header}
    </div>
  );
}
