"use client";

import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { scoreHint } from "@/domain/voting/voting";
import { compareRows, headToHeadText, type HeadToHead } from "@/domain/stats/head-to-head";
import type { EvolutionPoint } from "@/domain/stats/evolution";
import { CompareTable, HeadToHeadCard } from "@/features/stats/components/compare-view";
import { EvolutionChart } from "@/features/stats/components/evolution-chart";
import { HistoryList } from "@/features/stats/components/history-list";
import { Podium } from "@/features/stats/components/podium";
import { RecentMatches } from "@/features/stats/components/recent-matches";
import type { HistoryMatch, RecentMatch } from "@/features/stats/queries";
import { VoteScale } from "@/features/voting/components/vote-scale";
import { VotingForm } from "@/features/voting/components/voting-form";
import { MatchRatingsList, OpenVotingCard, PendingVotingBanner, type PublishedRating } from "@/features/voting/components/voting-section";

/*
 * Datos fijos (sin Date.now): "ahora" es el lunes 19/10/2026 15:00 en Buenos Aires.
 */
const TZ = "America/Argentina/Buenos_Aires";
const NOW_MS = Date.parse("2026-10-19T18:00:00Z");

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

const RATINGS: PublishedRating[] = [
  { playerId: "p1", nickname: "Brito", avatarUrl: null, side: "a", votes: 8, adjustedAverage: 8.25 },
  { playerId: "p2", nickname: "Manu", avatarUrl: null, side: "b", votes: 7, adjustedAverage: 7.4 },
  { playerId: "p3", nickname: "Chino", avatarUrl: null, side: "a", votes: 8, adjustedAverage: 6.85 },
  { playerId: "p4", nickname: "Tano", avatarUrl: null, side: "b", votes: 2, adjustedAverage: null },
];

const PODIUM = [
  { playerId: "p1", nickname: "Brito", avatarUrl: null, display: "12", href: "#" },
  { playerId: "p2", nickname: "Manu", avatarUrl: null, display: "9", href: "#" },
  { playerId: "p3", nickname: "Chino Rodríguez", avatarUrl: null, display: "7", href: "#" },
];

const EVOLUTION: EvolutionPoint[] = [
  { matchId: "e1", date: "2026-08-08", label: "08/08", skill: 6, performance: null },
  { matchId: "e2", date: "2026-08-15", label: "15/08", skill: 6.12, performance: 6.8 },
  { matchId: "e3", date: "2026-08-22", label: "22/08", skill: 6.05, performance: 5.6 },
  { matchId: "e4", date: "2026-08-29", label: "29/08", skill: 6.3, performance: 7.4 },
  { matchId: "e5", date: "2026-09-05", label: "05/09", skill: 6.42, performance: 7.1 },
  { matchId: "e6", date: "2026-09-12", label: "12/09", skill: 6.38, performance: null },
  { matchId: "e7", date: "2026-09-19", label: "19/09", skill: 6.61, performance: 8.2 },
  { matchId: "e8", date: "2026-09-26", label: "26/09", skill: 6.7, performance: 7.3 },
  { matchId: "e9", date: "2026-10-03", label: "03/10", skill: 6.64, performance: 6.2 },
  { matchId: "e10", date: "2026-10-10", label: "10/10", skill: 6.88, performance: 8 },
];

const RECENT: RecentMatch[] = [
  { matchId: "r1", scheduledAt: "2026-10-18T01:00:00Z", goalsFor: 5, goalsAgainst: 3, goals: 2, assists: 1, isMvp: true, performance: 8.1 },
  { matchId: "r2", scheduledAt: "2026-10-11T01:00:00Z", goalsFor: 2, goalsAgainst: 2, goals: 0, assists: 0, isMvp: false, performance: 6.4 },
  { matchId: "r3", scheduledAt: "2026-10-04T01:00:00Z", goalsFor: 1, goalsAgainst: 4, goals: 1, assists: 0, isMvp: false, performance: null },
];

const HISTORY: HistoryMatch[] = [
  {
    id: "h1",
    scheduledAt: "2026-10-18T01:00:00Z",
    venue: "El Potrero",
    teams: { a: { name: "Azul", score: 5 }, b: { name: "Rojo", score: 3 } },
    scorers: "Brito 2, Manu, Chino +2",
    mvp: { id: "p1", nickname: "Brito" },
    averageRating: 6.84,
  },
  {
    id: "h2",
    scheduledAt: "2026-09-27T01:00:00Z",
    venue: null,
    teams: { a: { name: "Azul", score: 2 }, b: { name: "Rojo", score: 2 } },
    scorers: "Tano, Zurdo",
    mvp: null,
    averageRating: null,
  },
];

const H2H: HeadToHead = { togetherMatches: 6, togetherWins: 4, togetherDraws: 1, togetherLosses: 1, againstMatches: 5, aWins: 3, bWins: 1, draws: 1 };

export function StatsSection() {
  const [score, setScore] = useState<number | null>(7);

  return (
    <section aria-labelledby="ui-kit-stats" className="space-y-8" onClickCapture={preventDemoNavigation}>
      <header className="space-y-1">
        <h2 id="ui-kit-stats" className="font-display text-display-md font-extrabold tracking-wide uppercase">
          Estadísticas
        </h2>
        <p className="text-sm text-muted-foreground">Votación, calificaciones, rankings, evolución, historial y comparador con datos de ejemplo.</p>
      </header>

      <Demo title="Jugador del partido" note="VotingForm: calificaciones y un único MVP (radiogroup, sin uno mismo). Se envían juntos.">
        <div className="max-w-2xl">
          <VotingForm
            groupId="00000000-0000-4000-8000-000000000001"
            matchId="00000000-0000-4000-8000-000000000002"
            saved={{}}
            savedMvp="00000000-0000-4000-8000-0000000000b2"
            groups={[
              {
                key: "teammates",
                title: "Tu equipo",
                side: "a",
                teamName: "Azul",
                players: [{ id: "00000000-0000-4000-8000-0000000000a1", nickname: "Manu", avatarUrl: null, position: "midfielder" }],
              },
              {
                key: "rivals",
                title: "Rivales",
                side: "b",
                teamName: "Rojo",
                players: [
                  { id: "00000000-0000-4000-8000-0000000000b1", nickname: "Vece", avatarUrl: null, position: "forward" },
                  { id: "00000000-0000-4000-8000-0000000000b2", nickname: "Juan Cruz Paramo", avatarUrl: null, position: "defender" },
                ],
              },
            ]}
          />
        </div>
      </Demo>
      <Demo title="VoteScale" note="Radiogroup 1-10 con foco itinerante: 5 por fila en el teléfono, 10 desde sm. Botones de 44 px.">
        <div className="list-group">
          <div className="space-y-2.5 px-4 py-3">
            <p className="flex items-center justify-between text-[15px] font-semibold">
              Brito
              <span className="text-xs font-semibold text-primary">{score ? `${score} · ${scoreHint(score)}` : "Sin calificar"}</span>
            </p>
            <VoteScale label="Calificación de Brito" value={score} onChange={setScore} />
          </div>
        </div>
      </Demo>

      <Demo title="PendingVotingBanner" note="Inicio del grupo: votaciones abiertas que te faltan completar.">
        <PendingVotingBanner
          nowMs={NOW_MS}
          items={[
            { matchId: "m1", href: "#", dayLabel: "Sáb 17/10", closesAt: "2026-10-19T20:00:00Z", rated: 3, total: 9 },
            { matchId: "m2", href: "#", dayLabel: "Jue 15/10", closesAt: "2026-10-21T03:00:00Z", rated: 0, total: 9 },
          ]}
        />
      </Demo>

      <Demo title="OpenVotingCard" note="Detalle del partido con la votación abierta: cierre, progreso (solo cantidades) y CTA.">
        <div className="grid gap-3 lg:grid-cols-2">
          <OpenVotingCard
            closesAt="2026-10-20T23:00:00Z"
            nowMs={NOW_MS}
            voters={4}
            eligible={9}
            voteHref="#"
            me={{ kind: "can-vote", rated: 3, total: 9 }}
          />
          <OpenVotingCard closesAt="2026-10-19T19:30:00Z" nowMs={NOW_MS} voters={0} eligible={9} voteHref="#" me={{ kind: "not-participant" }} />
        </div>
      </Demo>

      <Demo title="MatchRatingsList" note="Calificaciones publicadas al cierre: promedio corregido con coma y votos; MVP en dorado.">
        <MatchRatingsList ratings={RATINGS} mvpId="p1" playerHref={() => "#"} />
      </Demo>

      <Demo title="Podium" note="Top 3 con tokens de medalla, orden visual 2 · 1 · 3 y DOM 1-2-3.">
        <Podium entries={PODIUM} unit="goles" className="max-w-md px-1 pt-2" />
      </Demo>

      <Demo title="EvolutionChart" note="Valoración (línea) y calificación por partido (puntos). Sin animación con movimiento reducido.">
        <EvolutionChart points={EVOLUTION} />
      </Demo>

      <Demo title="RecentMatches" note="Resultado V/E/D, marcador propio, aporte y calificación.">
        <RecentMatches matches={RECENT} timeZone={TZ} matchHref={() => "#"} />
      </Demo>

      <Demo title="HistoryList" note="Agrupado por mes en la zona del grupo, con goleadores, MVP y promedio.">
        <HistoryList matches={HISTORY} timeZone={TZ} matchHref={() => "#"} />
      </Demo>

      <Demo title="Comparador" note="Lado a lado (el mejor de cada fila resaltado) y cara a cara.">
        <div className="max-w-2xl space-y-3">
          <CompareTable
            nameA="Brito"
            nameB="Manu"
            rows={compareRows(
              { matches: 18, wins: 10, draws: 3, losses: 5, goals: 14, assists: 6, mvps: 4, overall: 72 },
              { matches: 15, wins: 7, draws: 2, losses: 6, goals: 16, assists: 3, mvps: 2, overall: 68 },
            )}
          />
          <HeadToHeadCard h2h={H2H} text={headToHeadText(H2H, "Brito", "Manu")} nameA="Brito" nameB="Manu" />
        </div>
      </Demo>
    </section>
  );
}
