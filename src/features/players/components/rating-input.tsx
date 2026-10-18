"use client";

import { Minus, Plus } from "lucide-react";
import { tierStyle } from "@/components/shared/tier-styles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  baseRatingHint,
  overall,
  RATING_MAX,
  RATING_MIN,
  RATING_STEP,
  ratingTier,
  stepRating,
  TIER_LABELS,
  TIER_THRESHOLDS,
} from "@/domain/players/rating";
import { cn } from "@/lib/utils";

const TICKS = (Object.entries(TIER_THRESHOLDS) as Array<[keyof typeof TIER_THRESHOLDS, number]>).map(([tier, at]) => ({
  tier,
  at,
  left: `${((at - RATING_MIN) / (RATING_MAX - RATING_MIN)) * 100}%`,
}));

const RANGE_GRADIENT =
  "bg-gradient-to-r from-[oklch(0.6_0.1_55)] via-[oklch(0.84_0.13_88)] to-[oklch(0.66_0.19_256)]";

/**
 * Nivel inicial (escala interna 1-10 en pasos de 0,5) mostrado como en la
 * carta: 10-99 con el color y el nombre del tier. Slider + botones −/+ para
 * ajustar fino con el pulgar. Envía el valor 1-10 en un input oculto.
 *
 * `id` va en el thumb (el elemento enfocable), así useFormErrorFocus lo
 * encuentra por aria-invalid.
 */
export function RatingInput({
  id,
  name,
  value,
  onChange,
  describedBy,
  invalid,
}: {
  id: string;
  name: string;
  value: number;
  onChange: (value: number) => void;
  describedBy?: string;
  invalid?: boolean;
}) {
  const tier = ratingTier(value);
  const card = overall(value);
  const hintId = `${id}-level`;

  return (
    <div className="grid gap-3">
      <input type="hidden" name={name} value={value} />

      <div className="flex items-end gap-3">
        <p aria-hidden="true" className={cn("font-display text-stat-xl font-extrabold tabular", tierStyle(value).text)}>
          {card}
        </p>
        <div className="min-w-0 space-y-1 pb-0.5">
          <Badge aria-hidden="true" tone="neutral" size="sm" className={tierStyle(value).text}>
            {TIER_LABELS[tier]}
          </Badge>
          <p id={hintId} className="text-xs text-muted-foreground">
            {baseRatingHint(value)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="pointer-coarse:size-11"
          aria-label="Bajar nivel"
          disabled={value <= RATING_MIN}
          onClick={() => onChange(stepRating(value, -1))}
        >
          <Minus aria-hidden="true" />
        </Button>
        <Slider
          min={RATING_MIN}
          max={RATING_MAX}
          step={RATING_STEP}
          value={[value]}
          onValueChange={([next]) => {
            if (next !== undefined) onChange(next);
          }}
          rangeClassName={RANGE_GRADIENT}
          thumbProps={{
            id,
            "aria-label": "Nivel inicial",
            "aria-valuetext": `${card} de 99, ${TIER_LABELS[tier]}`,
            "aria-invalid": invalid || undefined,
            "aria-describedby": [hintId, describedBy].filter(Boolean).join(" "),
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="pointer-coarse:size-11"
          aria-label="Subir nivel"
          disabled={value >= RATING_MAX}
          onClick={() => onChange(stepRating(value, 1))}
        >
          <Plus aria-hidden="true" />
        </Button>

        {/* Umbrales de cada tier, alineados con la pista */}
        <div aria-hidden="true" className="relative col-start-2 h-6">
          {TICKS.map((tick) => (
            <span
              key={tick.tier}
              className="absolute top-0 flex -translate-x-1/2 flex-col items-center text-2xs leading-none text-muted-foreground"
              style={{ left: tick.left }}
            >
              <span className="mb-1 h-1.5 w-px bg-muted-foreground/40" />
              {TIER_LABELS[tick.tier]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
