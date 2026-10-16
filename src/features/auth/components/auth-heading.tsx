import type { ReactNode } from "react";

export function AuthHeading({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h1 className="font-display text-4xl leading-none font-extrabold tracking-wide uppercase">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

/** Esqueleto mientras se resuelven los parámetros de la URL. */
export function AuthFormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <div className="grid gap-5" aria-hidden="true">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="grid gap-2">
          <div className="h-3.5 w-20 animate-pulse rounded bg-muted" />
          <div className="h-11 animate-pulse rounded-lg bg-muted" />
        </div>
      ))}
      <div className="h-12 animate-pulse rounded-xl bg-primary/30" />
    </div>
  );
}
