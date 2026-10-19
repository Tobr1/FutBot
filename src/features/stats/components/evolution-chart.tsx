"use client";

import { useId } from "react";
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, type TooltipContentProps, XAxis, YAxis } from "recharts";
import { overall } from "@/domain/players/rating";
import { formatDecimal } from "@/domain/rating";
import { type EvolutionPoint, evolutionDomain, evolutionSummary } from "@/domain/stats/evolution";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 };

function ChartTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as EvolutionPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="panel-raised min-w-32 rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground">{point.label}</p>
      <p className="mt-1 flex items-center justify-between gap-3 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-3 rounded-full bg-primary" />
          Valoración
        </span>
        <span className="font-semibold text-foreground tabular">{overall(point.skill)}</span>
      </p>
      <p className="flex items-center justify-between gap-3 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rounded-full bg-foreground/70" />
          Calificación
        </span>
        <span className="font-semibold text-foreground tabular">
          {point.performance === null ? "—" : formatDecimal(point.performance)}
        </span>
      </p>
    </div>
  );
}

/**
 * Evolución de la valoración (línea, escala 1-10) con la calificación de
 * cada partido (puntos). Tema oscuro con tokens, sin grilla vertical, título
 * y descripción accesibles, y sin animación con movimiento reducido.
 */
export function EvolutionChart({ points, className }: { points: EvolutionPoint[]; className?: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const titleId = useId();
  const descId = useId();
  const [min, max] = evolutionDomain(points);
  const ticks = Array.from({ length: max - min + 1 }, (_, i) => min + i).filter((t) => (max - min > 4 ? t % 2 === 0 : true));

  return (
    <figure aria-labelledby={titleId} aria-describedby={descId} className={cn("panel rounded-xl p-3 pt-4", className)}>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
        <span id={titleId} className="text-sm font-semibold">
          Valoración por partido
        </span>
        <span aria-hidden="true" className="flex items-center gap-3 text-2xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full bg-primary" />
            Valoración
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-foreground/70" />
            Calificación
          </span>
        </span>
      </figcaption>
      <p id={descId} className="sr-only">
        {evolutionSummary(points)}
      </p>
      <div aria-hidden="true" className="mt-2 h-48 w-full sm:h-56">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 192 }}>
          <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} accessibilityLayer={false}>
            <CartesianGrid vertical={false} stroke="var(--hairline)" />
            <XAxis
              dataKey="label"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              minTickGap={18}
              interval="preserveStartEnd"
            />
            <YAxis domain={[min, max]} ticks={ticks} tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
            <Tooltip
              content={ChartTooltip}
              cursor={{ stroke: "var(--hairline)", strokeWidth: 1 }}
              isAnimationActive={!reducedMotion}
            />
            <Line
              type="monotone"
              dataKey="skill"
              stroke="var(--primary)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "var(--primary)", stroke: "var(--background)", strokeWidth: 2 }}
              isAnimationActive={!reducedMotion}
              animationDuration={400}
            />
            {/* Solo puntos: la calificación de cada partido (sin votos no hay punto). */}
            <Line
              type="monotone"
              dataKey="performance"
              stroke="transparent"
              connectNulls={false}
              dot={{ r: 3.5, fill: "var(--foreground)", fillOpacity: 0.7, stroke: "var(--background)", strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: "var(--foreground)", stroke: "var(--background)", strokeWidth: 2 }}
              isAnimationActive={false}
              legendType="none"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
