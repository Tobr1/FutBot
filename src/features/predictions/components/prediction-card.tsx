"use client";

import { Check, Loader2, Lock, Target, Trophy } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { predictionHit, predictionPoints, type Score } from "@/domain/predictions/member";
import { Stepper } from "@/features/matches/components/stepper";
import { cn } from "@/lib/utils";
import { savePredictionAction } from "../actions";

export interface PredictionEntryView {
  profileId: string;
  name: string;
  avatarUrl: string | null;
  prediction: Score;
}

/**
 * Pronósticos de un partido. Antes del inicio: mi pronóstico (dos contadores
 * y guardar) y cuántos pronosticaron. Desde el inicio: los de todos y, con
 * resultado, los puntos de cada uno (3 exacto, 1 ganador).
 */
export function PredictionCard({
  matchId,
  teams,
  mine,
  count,
  phase,
  entries,
  result,
  myProfileId,
  standingsHref,
}: {
  matchId: string;
  teams: { a: string; b: string };
  mine: Score | null;
  count: number;
  /** open: se puede pronosticar · waiting: faltan los equipos · locked: ya empezó. */
  phase: "open" | "waiting" | "locked";
  entries: PredictionEntryView[];
  result: Score | null;
  myProfileId: string;
  standingsHref: string;
}) {
  const [draft, setDraft] = useState<Score>(mine ?? { a: 0, b: 0 });
  const [isPending, startTransition] = useTransition();
  const changed = !mine || mine.a !== draft.a || mine.b !== draft.b;

  function save() {
    if (isPending || !changed) return;
    startTransition(async () => {
      const r = await savePredictionAction({ matchId, scoreA: draft.a, scoreB: draft.b });
      if (r.ok) toast.success(r.message);
      else toast.error(r.message);
    });
  }

  return (
    <section aria-labelledby="pronosticos" className="panel space-y-4 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
          <Target className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="pronosticos" className="text-[15px] font-semibold">
            {phase === "locked" ? "Pronósticos" : "¿Cómo sale?"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {phase === "waiting"
              ? "Se pronostica cuando estén armados los equipos."
              : phase === "open"
                ? `${count === 0 ? "Nadie pronosticó todavía" : count === 1 ? "1 pronosticó" : `${count} pronosticaron`}. Se ven todos cuando empieza.`
                : "3 puntos por el resultado exacto, 1 por acertar quién gana."}
          </p>
        </div>
      </div>

      {phase === "open" && (
        <>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            {(["a", "b"] as const).map((side, index) => (
              <div key={side} className={cn("flex min-w-0 flex-col items-center gap-1.5", index === 1 && "col-start-3")}>
                <p className={cn("max-w-full truncate text-sm font-semibold", side === "a" ? "text-team-a" : "text-team-b")}>{teams[side]}</p>
                <Stepper
                  label={`goles de ${teams[side]} en tu pronóstico`}
                  tone={side === "a" ? "team-a" : "team-b"}
                  value={draft[side]}
                  max={30}
                  onChange={(value) => setDraft((d) => ({ ...d, [side]: value }))}
                />
              </div>
            ))}
            <span aria-hidden="true" className="col-start-2 row-start-1 self-end pb-2 font-display text-2xl font-extrabold text-muted-foreground">
              –
            </span>
          </div>
          <Button type="button" size="lg" className="w-full lg:w-auto" onClick={save} disabled={isPending || !changed} aria-busy={isPending || undefined}>
            {isPending ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
            {mine ? (changed ? "Cambiar mi pronóstico" : "Pronóstico guardado") : "Guardar pronóstico"}
          </Button>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3.5 shrink-0" aria-hidden="true" />
            Nadie ve tu pronóstico hasta que empieza el partido.
          </p>
        </>
      )}

      {phase === "locked" &&
        (entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nadie pronosticó este partido.</p>
        ) : (
          <ul className="list-group" aria-label="Pronósticos del partido">
            {entries.map((e) => {
              const points = result ? predictionPoints(e.prediction, result) : null;
              const exact = result ? predictionHit(e.prediction, result) === "exact" : false;
              return (
                <li key={e.profileId} className={cn("flex min-h-12 items-center gap-3 px-4 py-2", exact && "bg-gold/8")}>
                  <UserAvatar name={e.name} src={e.avatarUrl} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">
                    {e.name}
                    {e.profileId === myProfileId && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(vos)</span>}
                  </span>
                  <span className="font-display text-lg font-extrabold tabular">
                    {e.prediction.a}–{e.prediction.b}
                  </span>
                  {points !== null && (
                    <Badge tone={points === 3 ? "gold" : points === 1 ? "primary" : "neutral"} size="sm" className="w-9 justify-center">
                      +{points}
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        ))}

      <Button asChild variant="ghost" size="sm" className="px-1 text-primary">
        <Link href={standingsHref} transitionTypes={["nav-forward"]}>
          <Trophy aria-hidden="true" />
          Tabla de pronosticadores
        </Link>
      </Button>
    </section>
  );
}
