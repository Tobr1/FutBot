"use client";

import type { MouseEvent, ReactNode } from "react";
import { awardProgress, computeAwards, computeRecords, groupAwards, latestAwards, monthlyAwards } from "@/domain/awards";
import { predictionAccuracy } from "@/domain/predictions/accuracy";
import { attendanceTop, goalsTrend, resultDistribution } from "@/domain/stats/analytics";
import type { MatchLineRow } from "@/domain/stats/engine-input";
import { duoRanking, findRivalries } from "@/domain/stats/rivalries";
import { AwardBadge } from "@/features/awards/components/award-badge";
import { AwardFeed, AwardProgressList, EarnedAwardsGrid, MonthAwardsList } from "@/features/awards/components/award-lists";
import { RecordsList } from "@/features/awards/components/records-list";
import { ShareActions } from "@/features/share/components/share-actions";
import { GoalsTrendChart } from "@/features/stats/components/goals-trend-chart";
import { AttendanceList, PredictionAccuracyCard, ResultDistributionCard } from "@/features/stats/components/insight-cards";
import { DuoRankingList, RivalsList } from "@/features/stats/components/rivals-card";

/*
 * Datos fijos: 8 sábados de septiembre y octubre de 2026 (sin Date.now) y
 * "hoy" = 19/10/2026, así septiembre ya tiene premios del mes.
 */
const TZ = "America/Argentina/Buenos_Aires";
const TODAY = "2026-10-19";

const PLAYERS = {
  brito: { nickname: "Brito", avatarUrl: null },
  manu: { nickname: "Manu", avatarUrl: null },
  chino: { nickname: "Chino Rodríguez", avatarUrl: null },
  tano: { nickname: "Tano", avatarUrl: null },
  pela: { nickname: "Pela", avatarUrl: null },
  colo: { nickname: "Colo", avatarUrl: null },
};

type Extras = Record<string, { g?: number; a?: number; mvp?: boolean }>;

function lines(matchId: string, iso: string, a: string[], b: string[], score: [number, number], extras: Extras = {}): MatchLineRow[] {
  const row = (playerId: string, side: "a" | "b"): MatchLineRow => ({
    matchId,
    playerId,
    side,
    scheduledAt: iso,
    goalsFor: side === "a" ? score[0] : score[1],
    goalsAgainst: side === "a" ? score[1] : score[0],
    goals: extras[playerId]?.g ?? 0,
    assists: extras[playerId]?.a ?? 0,
    ownGoals: 0,
    isMvp: extras[playerId]?.mvp ?? false,
  });
  return [...a.map((id) => row(id, "a")), ...b.map((id) => row(id, "b"))];
}

const LINES: MatchLineRow[] = [
  ...lines("k1", "2026-09-06T01:00:00Z", ["brito", "manu", "pela"], ["chino", "tano", "colo"], [4, 2], { brito: { g: 3, mvp: true }, manu: { g: 1, a: 3 }, chino: { g: 2 } }),
  ...lines("k2", "2026-09-13T01:00:00Z", ["brito", "manu", "colo"], ["chino", "tano", "pela"], [2, 0], { manu: { g: 2, mvp: true } }),
  ...lines("k3", "2026-09-20T01:00:00Z", ["brito", "manu", "tano"], ["chino", "pela", "colo"], [3, 3], { brito: { g: 2 }, chino: { g: 2, mvp: true }, tano: { g: 1 } }),
  ...lines("k4", "2026-09-27T01:00:00Z", ["brito", "manu", "chino"], ["tano", "pela", "colo"], [5, 1], { brito: { g: 2, mvp: true }, chino: { g: 3 } }),
  ...lines("k5", "2026-10-04T01:00:00Z", ["brito", "pela", "colo"], ["manu", "chino", "tano"], [1, 2], { manu: { g: 1 }, chino: { g: 1, mvp: true } }),
  ...lines("k6", "2026-10-11T01:00:00Z", ["brito", "manu", "pela"], ["chino", "tano", "colo"], [2, 1], { brito: { g: 1, mvp: true } }),
  ...lines("k7", "2026-10-18T01:00:00Z", ["brito", "manu", "colo"], ["chino", "tano", "pela"], [3, 0], { manu: { g: 2, mvp: true }, brito: { g: 1 } }),
];

const POSITIONS = { tano: "defender", colo: "goalkeeper" } as const;
const AWARDS = computeAwards({ lines: LINES, timeZone: TZ, today: TODAY, positions: POSITIONS });
const SKILL: Record<string, number> = { brito: 7.6, manu: 7.1, chino: 6.8, tano: 5.4, pela: 5.1, colo: 5.8 };

function preventDemoNavigation(event: MouseEvent) {
  if ((event.target as HTMLElement).closest("a")) event.preventDefault();
}

function Demo({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-base font-semibold tracking-tight">{title}</h3>
        {note ? <p className="text-xs text-muted-foreground">{note}</p> : null}
      </div>
      {children}
    </div>
  );
}

export function AwardsSection() {
  const playerHref = () => "#";
  const brito = AWARDS.filter((a) => a.playerId === "brito");

  return (
    <section aria-labelledby="ui-kit-premios" className="space-y-8" onClickCapture={preventDemoNavigation}>
      <header className="space-y-1">
        <h2 id="ui-kit-premios" className="font-display text-display-md font-extrabold tracking-wide uppercase">
          Premios y análisis
        </h2>
        <p className="text-sm text-muted-foreground">Logros, Salón de la fama, rivalidades, análisis del grupo y compartir, con 7 partidos de ejemplo.</p>
      </header>

      <Demo title="AwardBadge" note="Tiers con tokens de medalla (oro = dorado de premios). Apagado = por ganar.">
        <div className="flex flex-wrap items-center gap-3">
          <AwardBadge icon="Flame" tier="gold" size="lg" />
          <AwardBadge icon="Handshake" tier="silver" size="lg" />
          <AwardBadge icon="Goal" tier="bronze" size="lg" />
          <AwardBadge icon="Star" tier="gold" />
          <AwardBadge icon="Medal" tier="silver" size="sm" locked />
        </div>
      </Demo>

      <Demo title="Logros de la ficha" note="Repetidos agrupados (×N), los de oro primero. Debajo, el progreso hacia el próximo escalón.">
        <EarnedAwardsGrid groups={groupAwards(brito)} timeZone={TZ} />
        <AwardProgressList items={awardProgress(LINES, "tano").filter((p) => !p.complete)} />
      </Demo>

      <Demo title="Últimos logros / Destacados del partido" note="Feed del inicio del grupo (sin debuts) y logros de un partido.">
        <AwardFeed awards={latestAwards(AWARDS, 5)} players={PLAYERS} playerHref={playerHref} timeZone={TZ} label="Últimos logros" />
      </Demo>

      <Demo title="Premios del mes" note="Solo meses cerrados; empates compartidos y MVP desempatado por calificación.">
        <MonthAwardsList months={monthlyAwards({ lines: LINES, timeZone: TZ, today: TODAY })} players={PLAYERS} playerHref={playerHref} />
      </Demo>

      <Demo title="Récords" note="A igualdad, el récord es de quien lo logró primero.">
        <RecordsList records={computeRecords(LINES)} players={PLAYERS} playerHref={playerHref} matchHref={playerHref} timeZone={TZ} />
      </Demo>

      <Demo title="Duplas y rivales" note="Mínimo 3 partidos juntos o en contra; cada fila abre el comparador.">
        <RivalsList rivalries={findRivalries(LINES, "brito")} players={PLAYERS} compareHref={() => "#"} />
        <DuoRankingList duos={duoRanking(LINES, { minMatches: 3, limit: 4 })} players={PLAYERS} compareHref={() => "#"} />
      </Demo>

      <Demo title="Análisis del grupo" note="Goles por partido (recharts), resultados Azul/Rojo/empate, pronóstico y asistencia.">
        <GoalsTrendChart points={goalsTrend(LINES, TZ)} />
        <ResultDistributionCard data={resultDistribution(LINES)} />
        <PredictionAccuracyCard data={predictionAccuracy(LINES, (_m, id) => SKILL[id] ?? 5)} />
        <AttendanceList entries={attendanceTop(LINES, 4)} players={PLAYERS} total={7} />
      </Demo>

      <Demo title="ShareActions" note="Compartir la imagen (hoja nativa con archivo o descarga) y el texto por WhatsApp. Acá la imagen no existe: muestra el error.">
        <ShareActions
          className="max-w-sm"
          imageUrl="/ui-kit/no-existe.png"
          fileName="fulbot-partido.png"
          title="Partido del Sáb 17/10"
          text={"Los del Sábado · Sáb 17/10\nAzul 3–0 Rojo\nMVP: Manu"}
          path="/ui-kit"
        />
      </Demo>
    </section>
  );
}
