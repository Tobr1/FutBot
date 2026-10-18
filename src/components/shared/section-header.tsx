import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { slugify } from "@/domain/names/normalize";
import { cn } from "@/lib/utils";

/**
 * Título de sección (Inter, no display) con contador opcional y un link
 * "Ver todo ›" a la derecha. El h2 recibe un id (por defecto, el slug del
 * título) para usarlo en aria-labelledby.
 */
export function SectionHeader({
  title,
  count,
  action,
  id,
  className,
}: {
  title: string;
  count?: number | string;
  action?: { label: string; href: string };
  id?: string;
  className?: string;
}) {
  const headingId = id ?? slugify(title) ?? undefined;
  return (
    <div className={cn("flex h-10 items-center justify-between gap-3", className)}>
      <div className="flex min-w-0 items-baseline">
        <h2 id={headingId} className="truncate text-base font-semibold tracking-tight">
          {title}
        </h2>
        {count !== undefined && <span className="ml-2 shrink-0 text-xs text-muted-foreground tabular">{count}</span>}
      </div>
      {action && (
        <Link
          href={action.href}
          transitionTypes={["nav-forward"]}
          className="inline-flex min-h-11 shrink-0 items-center gap-0.5 rounded-md text-sm font-medium text-primary transition-opacity active:opacity-70"
        >
          {action.label}
          <ChevronRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}
