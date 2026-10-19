"use client";

import { useId } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, type TooltipContentProps, XAxis, YAxis } from "recharts";
import { formatDecimal } from "@/domain/rating";
import { type GoalsPoint, goalsTrendSummary } from "@/domain/stats/analytics";
import { usePrefersReducedMotion } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 11 };

function ChartTooltip({ active, payload }: TooltipContentProps) {
  const point = payload?.[0]?.payload as GoalsPoint | undefined;
  if (!active || !point) return null;
  return (
    <div className="panel-raised min-w-32 rounded-lg px-3 py-2 text-xs">
      <p className="font-semibold text-foreground">{point.label}</p>
      <p className="mt-1 flex items-center justify-between gap-3 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2 rounded-sm bg-primary/60" />
          Goles
        </span>
        <span className="font-semibold text-foreground tabular">{point.goals}</span>
      </p>
      <p className="flex items-center justify-between gap-3 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0.5 w-3 rounded-full bg-foreground/80" />
          Promedio
        </span>
        <span className="font-semibold text-foreground tabular">{formatDecimal(point.average)}</span>
      </p>
    </div>
  );
}

/** Goles por partido (barras) con la media de los últimos 5 (línea). */
export function GoalsTrendChart({ points, className }: { points: GoalsPoint[]; className?: string }) {
  const reducedMotion = usePrefersReducedMotion();
  const titleId = useId();
  const descId = useId();

  return (
    <figure aria-labelledby={titleId} aria-describedby={descId} className={cn("panel rounded-xl p-3 pt-4", className)}>
      <figcaption className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
        <span id={titleId} className="text-sm font-semibold">
          Goles por partido
        </span>
        <span aria-hidden="true" className="flex items-center gap-3 text-2xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-primary/60" />
            Goles
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded-full bg-foreground/80" />
            Promedio (5)
          </span>
        </span>
      </figcaption>
      <p id={descId} className="sr-only">
        {goalsTrendSummary(points)}
      </p>
      <div aria-hidden="true" className="mt-2 h-48 w-full sm:h-56">
        <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 320, height: 192 }}>
          <ComposedChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -22 }} accessibilityLayer={false}>
            <CartesianGrid vertical={false} stroke="var(--hairline)" />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={false} minTickGap={18} interval="preserveStartEnd" />
            <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
            <Tooltip content={ChartTooltip} cursor={{ fill: "var(--hairline)" }} isAnimationActive={!reducedMotion} />
            <Bar
              dataKey="goals"
              fill="var(--primary)"
              fillOpacity={0.55}
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
              isAnimationActive={!reducedMotion}
              animationDuration={400}
            />
            <Line
              type="monotone"
              dataKey="average"
              stroke="var(--foreground)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "var(--foreground)", stroke: "var(--background)", strokeWidth: 2 }}
              isAnimationActive={!reducedMotion}
              animationDuration={400}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}
