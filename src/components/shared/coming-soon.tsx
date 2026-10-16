import type { LucideIcon } from "lucide-react";
import { CheckCircle2 } from "lucide-react";
import { EmptyState } from "./empty-state";

/** Sección planificada en una fase posterior del roadmap (docs/ANALISIS.md §8). */
export function ComingSoon({ icon, title, phase, items }: { icon: LucideIcon; title: string; phase: string; items: string[] }) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={
        <>
          <span className="mb-3 inline-block rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">{phase}</span>
          <span className="block text-left">
            {items.map((item) => (
              <span key={item} className="flex items-start gap-2 py-0.5">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary/70" aria-hidden="true" />
                {item}
              </span>
            ))}
          </span>
        </>
      }
    />
  );
}
