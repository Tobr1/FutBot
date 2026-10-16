import { CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface ChecklistStep {
  title: string;
  description: string;
  done: boolean;
  href?: string;
  cta?: string;
  disabledReason?: string;
}

/** Primeros pasos para un admin con el grupo recién creado. */
export function OnboardingChecklist({ steps }: { steps: ChecklistStep[] }) {
  const completed = steps.filter((s) => s.done).length;
  return (
    <section aria-labelledby="onboarding-title" className="rounded-2xl border border-primary/25 bg-primary/[0.06] p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="onboarding-title" className="font-display text-xl font-bold tracking-wide uppercase">
          Primeros pasos
        </h2>
        <span className="text-xs text-muted-foreground tabular">
          {completed}/{steps.length} listos
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(completed / steps.length) * 100}%` }} />
      </div>
      <ol className="mt-4 space-y-3">
        {steps.map((step) => (
          <li key={step.title} className="flex items-start gap-3">
            {step.done ? (
              <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-label="Hecho" />
            ) : (
              <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-label="Pendiente" />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm font-semibold", step.done && "text-muted-foreground line-through")}>{step.title}</p>
              <p className="text-xs text-muted-foreground">{step.disabledReason ?? step.description}</p>
            </div>
            {!step.done && step.href && step.cta && (
              <Link href={step.href} className="shrink-0 text-sm font-medium text-primary hover:underline">
                {step.cta}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
