import type { ReactNode } from "react";

export function AuthHeading({ title, description }: { title: string; description?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <h1 className="font-display text-display-lg font-extrabold tracking-wide uppercase sm:text-4xl">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
  );
}
