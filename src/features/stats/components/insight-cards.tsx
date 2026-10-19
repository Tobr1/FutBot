import { Target } from "lucide-react";
import { UserAvatar } from "@/components/shared/user-avatar";
import { type PredictionAccuracy, percentText } from "@/domain/predictions/accuracy";
import { formatDecimal } from "@/domain/rating";
import type { AttendanceEntry, ResultDistribution } from "@/domain/stats/analytics";
import { cn } from "@/lib/utils";
import type { NameMap } from "./rivals-card";

const pct = (n: number, total: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

/** Reparto de resultados: victorias de Azul, empates y victorias de Rojo, más goles y diferencia media. */
export function ResultDistributionCard({ data }: { data: ResultDistribution }) {
  const segments = [
    { key: "a", label: "Azul", value: data.aWins, bar: "bg-team-a", text: "text-team-a" },
    { key: "draw", label: "Empates", value: data.draws, bar: "bg-draw", text: "text-draw" },
    { key: "b", label: "Rojo", value: data.bWins, bar: "bg-team-b", text: "text-team-b" },
  ];
  return (
    <div className="panel space-y-4 rounded-xl p-4">
      <div
        role="img"
        aria-label={`Azul ganó ${data.aWins}, empataron ${data.draws} y Rojo ganó ${data.bWins} de ${data.matches} partidos.`}
        className="flex h-3 overflow-hidden rounded-full bg-surface-3"
      >
        {segments.map((s) =>
          s.value > 0 ? <span key={s.key} className={cn("h-full", s.bar)} style={{ width: `${pct(s.value, data.matches)}%` }} /> : null,
        )}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-center">
        {segments.map((s) => (
          <div key={s.key}>
            <dt className={cn("text-2xs font-semibold tracking-[0.12em] uppercase", s.text)}>{s.label}</dt>
            <dd className="font-display text-stat font-extrabold tabular">{s.value}</dd>
            <dd className="text-xs text-muted-foreground tabular">{pct(s.value, data.matches)}%</dd>
          </div>
        ))}
      </dl>
      <dl className="grid grid-cols-3 divide-x divide-hairline border-t border-hairline pt-3 text-center">
        <div>
          <dt className="text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Goles/PJ</dt>
          <dd className="font-display text-xl font-extrabold tabular">{data.goalsPerMatch === null ? "—" : formatDecimal(data.goalsPerMatch)}</dd>
        </div>
        <div>
          <dt className="text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Dif. media</dt>
          <dd className="font-display text-xl font-extrabold tabular">{data.averageMargin === null ? "—" : formatDecimal(data.averageMargin)}</dd>
        </div>
        <div>
          <dt className="text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Por 1 gol</dt>
          <dd className="font-display text-xl font-extrabold tabular">{data.oneGoalGames}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Precisión del pronóstico del sistema: aciertos del favorito y calibración por rangos. */
export function PredictionAccuracyCard({ data }: { data: PredictionAccuracy }) {
  return (
    <div className="panel space-y-4 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <span aria-hidden="true" className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25 ring-inset">
          <Target className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Precisión del pronóstico</p>
          <p className="text-sm">
            <span className="font-display text-stat font-extrabold text-primary tabular">{percentText(data.hitRate)}</span>{" "}
            <span className="text-muted-foreground">de aciertos</span>
          </p>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Antes de cada partido, el sistema elige un favorito con la valoración de ese momento. Acertó {data.hits} de {data.decided}
        {data.draws > 0
          ? `; ${data.draws} ${data.draws === 1 ? "terminó empatado (cuenta como error)" : "terminaron empatados (cuentan como error)"}`
          : ""}
        .
      </p>
      <div className="space-y-3">
        <p className="text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Calibración</p>
        <ul className="space-y-3">
          {data.calibration.map((b) => (
            <li key={b.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">{b.label}</span>
                <span className="shrink-0 text-xs text-muted-foreground tabular">
                  {b.matches} {b.matches === 1 ? "partido" : "partidos"}
                </span>
              </div>
              {b.observed === null ? (
                <p className="text-xs text-muted-foreground">Sin partidos en este rango.</p>
              ) : (
                <>
                  <div
                    role="img"
                    aria-label={`${b.label}: esperado ${percentText(b.expected)}, real ${percentText(b.observed)}`}
                    className="relative h-2 overflow-hidden rounded-full bg-surface-3"
                  >
                    <span className="absolute inset-y-0 left-0 rounded-full bg-primary" style={{ width: `${Math.round(b.observed * 100)}%` }} />
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-[-2px] w-0.5 rounded-full bg-foreground"
                      style={{ left: `calc(${Math.round(b.expected * 100)}% - 1px)` }}
                    />
                  </div>
                  <p aria-hidden="true" className="text-xs text-muted-foreground tabular">
                    Real <span className="font-semibold text-foreground">{percentText(b.observed)}</span> · esperado {percentText(b.expected)}
                  </p>
                </>
              )}
            </li>
          ))}
        </ul>
        <p className="text-2xs text-muted-foreground">La barra es lo que pasó; la marca blanca, lo que esperaba el sistema.</p>
      </div>
    </div>
  );
}

/** Los que más vinieron en el período. */
export function AttendanceList({ entries, players, total }: { entries: AttendanceEntry[]; players: NameMap; total: number }) {
  return (
    <ol className="list-group" aria-label="Asistencia">
      {entries.map((e, index) => {
        const name = players[e.playerId]?.nickname ?? "Jugador";
        return (
          <li key={e.playerId} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
            <span className="w-5 shrink-0 text-center font-display text-lg font-extrabold text-muted-foreground tabular">{index + 1}</span>
            <UserAvatar name={name} src={players[e.playerId]?.avatarUrl} size="sm" />
            <span className="min-w-0 flex-1 space-y-1">
              <span className="block truncate text-[15px] font-semibold">{name}</span>
              <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-surface-3">
                <span className="block h-full rounded-full bg-primary/70" style={{ width: `${Math.round(e.share * 100)}%` }} />
              </span>
            </span>
            <span className="shrink-0 text-right">
              <span className="block font-display text-lg leading-none font-extrabold tabular">
                {e.matches}
                <span className="text-xs font-semibold text-muted-foreground">/{total}</span>
              </span>
              <span className="block text-2xs text-muted-foreground tabular">{Math.round(e.share * 100)}%</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
