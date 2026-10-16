import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pitch-lines flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border bg-surface/60 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary ring-1 ring-primary/25">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <div className="max-w-sm space-y-1.5">
        <h3 className="font-display text-xl font-bold tracking-wide uppercase">{title}</h3>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
