import { TrendingUp } from "lucide-react";
import type { Side } from "@/domain/balancer";
import { formatWinProbability, roundProbabilities } from "@/domain/matches/team-generator";
import type { WinProbability } from "@/domain/rating";
import { cn } from "@/lib/utils";

/**
 * Barra de tres tramos (gana A · empate · gana B) con los porcentajes debajo.
 * Se lee como una sola imagen accesible con el texto completo.
 */
export function WinProbabilityBar({
  probability,
  names,
  size = "md",
  className,
}: {
  probability: WinProbability;
  names: Record<Side, string>;
  size?: "sm" | "md";
  className?: string;
}) {
  const r = roundProbabilities(probability);
  return (
    <div role="img" aria-label={`Pronóstico: ${formatWinProbability(probability, names)}`} className={cn("min-w-0", className)}>
      <div className={cn("flex gap-0.5 overflow-hidden rounded-full", size === "sm" ? "h-1.5" : "h-2")}>
        <span className="h-full bg-team-a" style={{ width: `${r.a}%` }} />
        <span className="h-full bg-draw/45" style={{ width: `${r.draw}%` }} />
        <span className="h-full flex-1 bg-team-b" />
      </div>
      <div
        aria-hidden="true"
        className={cn("mt-1.5 grid grid-cols-[1fr_auto_1fr] items-baseline gap-2 tabular", size === "sm" ? "text-xs" : "text-sm")}
      >
        <span className="min-w-0 truncate">
          <span className="font-display text-base leading-none font-extrabold text-team-a">{r.a}%</span>{" "}
          <span className="text-muted-foreground">{names.a}</span>
        </span>
        <span className="text-center text-muted-foreground">
          Empate <span className="font-semibold text-foreground">{r.draw}%</span>
        </span>
        <span className="min-w-0 truncate text-right">
          <span className="text-muted-foreground">{names.b}</span>{" "}
          <span className="font-display text-base leading-none font-extrabold text-team-b">{r.b}%</span>
        </span>
      </div>
    </div>
  );
}

/** Tarjeta "Pronóstico" para un partido con equipos armados y sin jugar. */
export function ForecastCard({
  probability,
  names,
  className,
  headingLevel = "h2",
  id = "pronostico",
}: {
  probability: WinProbability;
  names: Record<Side, string>;
  className?: string;
  headingLevel?: "h2" | "h3";
  /** id del título (único en la página). */
  id?: string;
}) {
  const Heading = headingLevel;
  return (
    <section aria-labelledby={id} className={cn("panel rounded-xl p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <Heading id={id} className="flex items-center gap-1.5 text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
          <TrendingUp className="size-3.5 text-primary" aria-hidden="true" />
          Pronóstico
        </Heading>
        <span className="text-2xs text-muted-foreground">Según la valoración actual</span>
      </div>
      <WinProbabilityBar probability={probability} names={names} className="mt-3" />
    </section>
  );
}
