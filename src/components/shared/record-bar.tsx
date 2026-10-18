import { cn } from "@/lib/utils";

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Barra segmentada de partidos ganados / empatados / perdidos con leyenda
 * PG · PE · PP. Sin partidos muestra una barra vacía.
 */
export function RecordBar({
  wins,
  draws,
  losses,
  className,
}: {
  wins: number;
  draws: number;
  losses: number;
  className?: string;
}) {
  const total = wins + draws + losses;

  if (!(total > 0)) {
    return (
      <div className={cn("space-y-2", className)}>
        <div aria-hidden="true" className="h-2 rounded-full bg-muted" />
        <p className="text-xs text-muted-foreground">Sin partidos todavía</p>
      </div>
    );
  }

  const segments = [
    { key: "win", value: wins, bar: "bg-win" },
    { key: "draw", value: draws, bar: "bg-draw" },
    { key: "loss", value: losses, bar: "bg-loss" },
  ].filter((s) => s.value > 0);

  const label = `Récord en ${plural(total, "partido", "partidos")}: ${plural(wins, "ganado", "ganados")}, ${plural(
    draws,
    "empatado",
    "empatados",
  )} y ${plural(losses, "perdido", "perdidos")}`;

  return (
    <div role="img" aria-label={label} className={cn("space-y-2", className)}>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full">
        {segments.map((s) => (
          <span key={s.key} className={cn("h-full min-w-1", s.bar)} style={{ flex: `${s.value} 1 0%` }} />
        ))}
      </div>
      <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground tabular">
        <LegendItem dot="bg-win" label="PG" value={wins} />
        <span aria-hidden="true">·</span>
        <LegendItem dot="bg-draw" label="PE" value={draws} />
        <span aria-hidden="true">·</span>
        <LegendItem dot="bg-loss" label="PP" value={losses} />
      </p>
    </div>
  );
}

function LegendItem({ dot, label, value }: { dot: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2 rounded-full", dot)} />
      {label} <span className="font-semibold text-foreground">{value}</span>
    </span>
  );
}
