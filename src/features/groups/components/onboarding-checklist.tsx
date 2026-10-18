import { CheckCircle2, ChevronDown, Circle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ChecklistStep {
  title: string;
  description: string;
  done: boolean;
  href?: string;
  cta?: string;
  /** El paso todavía no se puede hacer: se muestra este texto como chip ("Muy pronto"). */
  disabledReason?: string;
}

/**
 * Primeros pasos para un admin con el grupo recién creado.
 * Sin pasos hechos se muestra abierta; con al menos uno, se pliega en un
 * <details> con el progreso a la vista para no ocupar la pantalla.
 */
export function OnboardingChecklist({ steps, className }: { steps: ChecklistStep[]; className?: string }) {
  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  const collapsible = done > 0;

  if (collapsible) {
    return (
      <details className={cn("group/checklist panel rounded-xl", className)}>
        <summary className="flex min-h-14 cursor-pointer list-none flex-col justify-center gap-2 rounded-xl px-4 py-3 outline-none select-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          <span className="flex items-center justify-between gap-3">
            <span className="text-[15px] font-semibold">
              Primeros pasos{" "}
              <span className="text-muted-foreground tabular">
                {done}/{total}
              </span>
            </span>
            <ChevronDown
              className="size-5 shrink-0 text-muted-foreground transition-transform duration-200 group-open/checklist:rotate-180 motion-reduce:transition-none"
              aria-hidden="true"
            />
          </span>
          <ProgressBar done={done} total={total} />
        </summary>
        <div className="border-t border-hairline px-4 pt-3 pb-4">
          <StepList steps={steps} />
        </div>
      </details>
    );
  }

  return (
    <section aria-labelledby="onboarding-title" className={cn("panel rounded-xl p-4", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="onboarding-title" className="text-[15px] font-semibold">
          Primeros pasos
        </h2>
        <span className="text-xs text-muted-foreground tabular">
          {done}/{total} listos
        </span>
      </div>
      <ProgressBar done={done} total={total} className="mt-2" />
      <StepList steps={steps} className="mt-4" />
    </section>
  );
}

function ProgressBar({ done, total, className }: { done: number; total: number; className?: string }) {
  return (
    <span aria-hidden="true" className={cn("block h-1.5 overflow-hidden rounded-full bg-surface-3", className)}>
      <span
        className="block h-full rounded-full bg-primary"
        style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
      />
    </span>
  );
}

function StepList({ steps, className }: { steps: ChecklistStep[]; className?: string }) {
  return (
    <ol className={cn("space-y-3", className)}>
      {steps.map((step) => (
        <li key={step.title} className="flex items-center gap-3">
          {step.done ? (
            <CheckCircle2 className="size-5 shrink-0 text-success" aria-label="Hecho" />
          ) : (
            <Circle className="size-5 shrink-0 text-muted-foreground" aria-label="Pendiente" />
          )}
          <div className="min-w-0 flex-1">
            <p className={cn("text-sm font-semibold", step.done && "text-muted-foreground line-through")}>{step.title}</p>
            <p className="text-xs text-muted-foreground">{step.description}</p>
          </div>
          {!step.done &&
            (step.disabledReason ? (
              <Badge tone="neutral" size="sm" className="shrink-0">
                {step.disabledReason}
              </Badge>
            ) : (
              step.href &&
              step.cta && (
                <Button asChild size="sm" variant="secondary" className="shrink-0">
                  <Link href={step.href} transitionTypes={["nav-forward"]}>
                    {step.cta}
                  </Link>
                </Button>
              )
            ))}
        </li>
      ))}
    </ol>
  );
}
