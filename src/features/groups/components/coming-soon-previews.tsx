import { cn } from "@/lib/utils";

/*
 * Vistas previas "fantasma" para ComingSoon (Partidos y Rankings). Son
 * estáticas y decorativas: ComingSoon las atenúa, las vuelve inertes y las
 * oculta a lectores de pantalla. Sin datos ni azar, para que el prerender
 * sea estable.
 */

const BAR = "block rounded bg-surface-3";
const SHIELD = "block shrink-0 rounded-[28%_28%_46%_46%] bg-surface-3 ring-1 ring-hairline ring-inset";

const FIXTURES = [
  { day: "SÁB", date: "22 h", home: "w-16", away: "w-20" },
  { day: "MIÉ", date: "21 h", home: "w-20", away: "w-14" },
];

/** Dos filas de fixture: fecha, escudos y marcador vacío. */
export function MatchesPreview() {
  return (
    <div className="list-group">
      {FIXTURES.map((fixture) => (
        <div key={fixture.day} className="flex items-center gap-3 px-4 py-3">
          <span className="grid w-11 shrink-0 place-items-center rounded-lg bg-surface-2 py-1 ring-1 ring-hairline ring-inset">
            <span className="text-2xs font-semibold tracking-wider text-muted-foreground">{fixture.day}</span>
            <span className="font-display text-sm leading-none font-bold">{fixture.date}</span>
          </span>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <span className={cn(BAR, "h-3", fixture.home)} />
            <span className={cn(SHIELD, "size-8")} />
          </div>
          <span className="shrink-0 font-display text-xl font-bold text-muted-foreground tabular">– : –</span>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className={cn(SHIELD, "size-8")} />
            <span className={cn(BAR, "h-3", fixture.away)} />
          </div>
        </div>
      ))}
    </div>
  );
}

const PODIUM = [
  { rank: 2, height: "h-14", color: "bg-medal-2/25 ring-medal-2/40 text-medal-2" },
  { rank: 1, height: "h-20", color: "bg-medal-1/25 ring-medal-1/40 text-medal-1" },
  { rank: 3, height: "h-10", color: "bg-medal-3/25 ring-medal-3/40 text-medal-3" },
];

const ROWS = [
  { rank: 4, title: "w-2/5", subtitle: "w-1/4" },
  { rank: 5, title: "w-1/2", subtitle: "w-1/3" },
  { rank: 6, title: "w-1/3", subtitle: "w-1/5" },
];

/** Podio de tres escalones con colores de medalla y tres filas de jugador. */
export function RankingsPreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-center gap-2 px-4">
        {PODIUM.map((step) => (
          <div key={step.rank} className="flex w-20 flex-col items-center gap-1.5">
            <span className="block size-10 rounded-full bg-surface-3 ring-1 ring-hairline" />
            <span className={cn(BAR, "h-2.5 w-12")} />
            <span
              className={cn(
                "grid w-full place-items-center rounded-t-lg font-display text-2xl font-extrabold ring-1 ring-inset",
                step.height,
                step.color,
              )}
            >
              {step.rank}
            </span>
          </div>
        ))}
      </div>
      <div className="list-group">
        {ROWS.map((row) => (
          <div key={row.rank} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
            <span className="w-6 text-center font-display text-lg font-bold text-muted-foreground tabular">{row.rank}</span>
            <span className="block size-8 shrink-0 rounded-full bg-surface-3" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <span className={cn(BAR, "h-3.5", row.title)} />
              <span className={cn(BAR, "h-3", row.subtitle)} />
            </div>
            <span className="block h-7 w-10 shrink-0 rounded-lg bg-surface-3" />
          </div>
        ))}
      </div>
    </div>
  );
}
