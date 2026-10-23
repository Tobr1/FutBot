"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { StickyActionBar } from "@/components/layout/sticky-action-bar";
import { CARD_STYLES } from "@/components/shared/tier-styles";
import { Button } from "@/components/ui/button";
import {
  ATTRIBUTE_MAX,
  ATTRIBUTE_MIN,
  ATTRIBUTES,
  type AttributeKind,
  CARD_TIER_LABELS,
  cardOverall,
  cardTier,
  clampAttribute,
} from "@/domain/cards/cards";
import type { Position } from "@/domain/players/positions";
import { canGoBackInApp } from "@/lib/navigation/in-app-history";
import { cn } from "@/lib/utils";
import { saveSelfAssessmentAction, saveValidationAction } from "../actions";

/**
 * Seis barras de 1 a 99 para autoevaluarse (mode="self") o validar a un
 * compañero (mode="peer", arranca con su autoevaluación o con mi validación
 * anterior). Muestra en vivo cómo quedaría la media con esos valores.
 */
export function AttributesForm({
  mode,
  groupId,
  playerId,
  position,
  kind,
  initial,
  backHref,
}: {
  mode: "self" | "peer";
  groupId: string;
  playerId: string;
  position: Position | null;
  kind: AttributeKind;
  initial: number[];
  /** A dónde volver después de guardar si no hay historial. */
  backHref: string;
}) {
  const router = useRouter();
  const formId = useId();
  const [values, setValues] = useState<number[]>(() => initial.map(clampAttribute));
  const [isPending, startTransition] = useTransition();
  const defs = ATTRIBUTES[kind];
  const preview = cardOverall(values, position);
  const tier = cardTier(preview);
  const style = CARD_STYLES[tier];

  function set(index: number, value: number) {
    setValues((current) => current.map((v, i) => (i === index ? clampAttribute(value) : v)));
  }

  function save() {
    if (isPending) return;
    startTransition(async () => {
      const result =
        mode === "self"
          ? await saveSelfAssessmentAction({ groupId, values })
          : await saveValidationAction({ playerId, values });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(result.message);
      if (canGoBackInApp()) router.back();
      else router.replace(backHref);
    });
  }

  return (
    <div className="space-y-5">
      <div className="panel flex items-center justify-between gap-3 rounded-xl p-4">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{mode === "self" ? "Tu media con estos valores" : "Su media con tus valores"}</p>
          <p className={cn("text-sm font-semibold", style.text)}>{CARD_TIER_LABELS[tier]}</p>
        </div>
        <p aria-live="polite" className={cn("font-display text-5xl leading-none font-extrabold tabular", style.text)}>
          <span className="sr-only">Media </span>
          {preview}
        </p>
      </div>

      <ul className="list-group" aria-label="Atributos">
        {defs.map((def, index) => {
          const inputId = `${formId}-${def.code}`;
          return (
            <li key={def.code} className="space-y-2 px-4 py-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <label htmlFor={inputId} className="min-w-0">
                  <span className="block text-[15px] font-semibold">
                    <span className="mr-1.5 font-display tracking-wide text-muted-foreground">{def.code}</span>
                    {def.label}
                  </span>
                  <span className="block text-xs text-muted-foreground">{def.hint}</span>
                </label>
                <span className={cn("w-10 shrink-0 text-right font-display text-2xl font-extrabold tabular", style.text)}>
                  {values[index]}
                </span>
              </div>
              <input
                id={inputId}
                type="range"
                min={ATTRIBUTE_MIN}
                max={ATTRIBUTE_MAX}
                step={1}
                value={values[index]}
                aria-valuetext={`${values[index]} de 99`}
                disabled={isPending}
                onChange={(e) => set(index, Number(e.target.value))}
                className="h-11 w-full cursor-pointer accent-primary"
              />
            </li>
          );
        })}
      </ul>

      <p className="text-xs text-muted-foreground">
        {mode === "self"
          ? "Sé honesto: la carta pesa 20 % lo que pongas vos y 80 % lo que validen tus compañeros. Deja de ser provisional con 3 validaciones."
          : "Tu validación es privada: nadie ve qué valores pusiste, solo cuenta en el promedio. La podés cambiar cuando quieras."}
      </p>

      <StickyActionBar>
        <Button type="button" size="lg" className="w-full" onClick={save} disabled={isPending}>
          {isPending ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
          {isPending ? "Guardando…" : mode === "self" ? "Guardar mi autoevaluación" : "Guardar validación"}
        </Button>
      </StickyActionBar>
    </div>
  );
}
