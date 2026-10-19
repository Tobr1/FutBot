"use client";

import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { NextMatchCard } from "@/features/groups/components/next-match-card";
import { LineupImport } from "@/features/matches/components/lineup-import";
import { MatchCard } from "@/features/matches/components/match-card";
import { ResultSummary, TeamColumns } from "@/features/matches/components/match-detail";
import { MatchCardSkeleton } from "@/features/matches/components/match-skeletons";
import { MatchStatusBadge } from "@/features/matches/components/match-status-badge";
import { Stepper } from "@/features/matches/components/stepper";
import type { MatchDetail, MatchListItem, MatchParticipant } from "@/features/matches/queries";

/*
 * Datos fijos (sin Date.now): "hoy" es el lunes 19/10/2026 en Buenos Aires.
 * Los instantes están en UTC (22:00 h local = 01:00 Z del día siguiente).
 */
const TZ = "America/Argentina/Buenos_Aires";
const TODAY = "2026-10-19";
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

const teams = (a: number | null, b: number | null): MatchListItem["teams"] => ({
  a: { name: "Azul", score: a },
  b: { name: "Rojo", score: b },
});

const CARDS: Array<{ note: string; match: MatchListItem }> = [
  {
    note: "Hoy · completo",
    match: {
      id: "m1",
      scheduledAt: "2026-10-20T01:00:00Z",
      venue: "El Potrero, cancha 3",
      playersPerTeam: 5,
      status: "scheduled",
      confirmed: 10,
      reserve: 2,
      teams: teams(null, null),
      mvp: null,
    },
  },
  {
    note: "Sábado · faltan jugadores",
    match: {
      id: "m2",
      scheduledAt: "2026-10-25T01:00:00Z",
      venue: null,
      playersPerTeam: 7,
      status: "scheduled",
      confirmed: 9,
      reserve: 0,
      teams: teams(null, null),
      mvp: null,
    },
  },
  {
    note: "En curso",
    match: {
      id: "m3",
      scheduledAt: "2026-10-19T17:00:00Z",
      venue: "Club Atlético Vecinal con nombre larguísimo",
      playersPerTeam: 5,
      status: "in_progress",
      confirmed: 10,
      reserve: 0,
      teams: teams(null, null),
      mvp: null,
    },
  },
  {
    note: "Falta resultado (ya pasó la hora)",
    match: {
      id: "m4",
      scheduledAt: "2026-10-17T01:00:00Z",
      venue: "El Potrero",
      playersPerTeam: 5,
      status: "scheduled",
      confirmed: 10,
      reserve: 1,
      teams: teams(null, null),
      mvp: null,
    },
  },
  {
    note: "Jugado · con MVP",
    match: {
      id: "m5",
      scheduledAt: "2026-10-11T01:00:00Z",
      venue: "El Potrero",
      playersPerTeam: 5,
      status: "finished",
      confirmed: 10,
      reserve: 0,
      teams: { a: { name: "Azul", score: 3 }, b: { name: "Los Pibes de Siempre", score: 2 } },
      mvp: { id: "p1", nickname: "Juan Cruz" },
    },
  },
  {
    note: "Cancelado",
    match: {
      id: "m6",
      scheduledAt: "2026-10-04T01:00:00Z",
      venue: "El Potrero",
      playersPerTeam: 5,
      status: "cancelled",
      confirmed: 6,
      reserve: 0,
      teams: teams(null, null),
      mvp: null,
    },
  },
];

const player = (id: string, nickname: string, rating: number, side: "a" | "b" | null): MatchParticipant => ({
  id,
  nickname,
  avatarUrl: null,
  baseRating: rating,
  positions: { primary: "midfielder", secondary: null },
  isActive: true,
  status: "confirmed",
  sortOrder: 0,
  side,
});

const PARTICIPANTS = [
  player("p1", "Juan Cruz", 8.4, "a"),
  player("p2", "Tano", 7.1, "a"),
  player("p3", "Ruso", 6, "a"),
  player("p4", "Pato", 5.5, "a"),
  player("p5", "Vece", 5, "a"),
  player("p6", "Manu", 7.8, "b"),
  player("p7", "Toto", 6.6, "b"),
  player("p8", "Maximiliano Gutiérrez", 6.2, "b"),
  player("p9", "Fede", 5.1, "b"),
  player("p10", "Lucho", 4.9, "b"),
];

const DETAIL: MatchDetail = {
  id: "m5",
  groupId: "g",
  scheduledAt: "2026-10-11T01:00:00Z",
  venue: "El Potrero",
  playersPerTeam: 5,
  status: "finished",
  notes: "Se jugó con lluvia el segundo tiempo.",
  finishedAt: "2026-10-11T03:00:00Z",
  votingClosesAt: null,
  mvp: { playerId: "p1", source: "admin" },
  participants: PARTICIPANTS,
  teams: {
    a: { id: "ta", name: "Azul", score: 3, memberIds: ["p1", "p2", "p3", "p4", "p5"] },
    b: { id: "tb", name: "Rojo", score: 2, memberIds: ["p6", "p7", "p8", "p9", "p10"] },
  },
  events: [
    { id: "e1", type: "goal", playerId: "p1", side: "a", minute: null },
    { id: "e2", type: "goal", playerId: "p1", side: "a", minute: null },
    { id: "e3", type: "assist", playerId: "p2", side: "a", minute: null },
    { id: "e4", type: "own_goal", playerId: "p9", side: "a", minute: null },
    { id: "e5", type: "goal", playerId: "p6", side: "b", minute: null },
  ],
  teamsReady: true,
};

const ROSTER = [
  { id: "r1", nickname: "Juanchi", fullName: "Juan Cruz Pérez" },
  { id: "r2", nickname: "Manu" },
  { id: "r3", nickname: "Vece", aliases: ["Vecellio"] },
  { id: "r4", nickname: "Toto" },
  { id: "r5", nickname: "Tota" },
];

export function MatchesSection() {
  const [scoreA, setScoreA] = useState(3);
  const [scoreB, setScoreB] = useState(2);
  const [goals, setGoals] = useState(1);

  return (
    <section aria-labelledby="ui-kit-matches" className="space-y-8" onClickCapture={preventDemoNavigation}>
      <header className="space-y-1">
        <h2 id="ui-kit-matches" className="font-display text-display-md font-extrabold tracking-wide uppercase">
          Partidos
        </h2>
        <p className="text-sm text-muted-foreground">Tarjetas, estados, marcador y armado con datos de ejemplo (hoy = lun 19/10).</p>
      </header>

      <Demo title="Estados" note="MatchStatusBadge: programado, en curso, falta resultado, jugado y cancelado.">
        <div className="flex flex-wrap gap-2">
          <MatchStatusBadge status="scheduled" />
          <MatchStatusBadge status="in_progress" />
          <MatchStatusBadge status="scheduled" pendingResult />
          <MatchStatusBadge status="finished" />
          <MatchStatusBadge status="cancelled" />
        </div>
      </Demo>

      <Demo title="MatchCard" note="Chip de fecha (Hoy/Mañana resaltado), cancha, formato, convocados; jugado con marcador y MVP.">
        <ul className="grid gap-2 lg:grid-cols-2">
          {CARDS.map(({ note, match }) => (
            <li key={match.id} className="space-y-1">
              <p className="text-2xs text-muted-foreground">{note}</p>
              <MatchCard href="#" match={match} timeZone={TZ} today={TODAY} nowMs={NOW_MS} />
            </li>
          ))}
          <li className="space-y-1">
            <p className="text-2xs text-muted-foreground">Skeleton</p>
            <MatchCardSkeleton />
          </li>
        </ul>
      </Demo>

      <Demo title="NextMatchCard" note="Inicio del grupo: próximo, último resultado y fantasma (admin / jugador).">
        <div className="grid gap-2 lg:grid-cols-2">
          <NextMatchCard slug="demo" featured={{ kind: "next", match: CARDS[0].match }} timeZone={TZ} today={TODAY} nowMs={NOW_MS} isAdmin />
          <NextMatchCard slug="demo" featured={{ kind: "last", match: CARDS[4].match }} timeZone={TZ} today={TODAY} nowMs={NOW_MS} isAdmin />
          <NextMatchCard slug="demo" featured={null} timeZone={TZ} today={TODAY} nowMs={NOW_MS} isAdmin />
          <NextMatchCard slug="demo" featured={null} timeZone={TZ} today={TODAY} nowMs={NOW_MS} isAdmin={false} />
        </div>
      </Demo>

      <Demo title="Stepper" note="Marcador (xl, vertical) y goles por jugador (sm). Botones de 44px o más.">
        <div className="panel flex items-start justify-center gap-6 rounded-2xl p-4">
          <Stepper size="xl" tone="team-a" label="goles de Azul" value={scoreA} onChange={setScoreA} />
          <span className="pt-20 font-display text-3xl font-extrabold text-muted-foreground">–</span>
          <Stepper size="xl" tone="team-b" label="goles de Rojo" value={scoreB} onChange={setScoreB} />
        </div>
        <div className="panel flex items-center justify-between gap-3 rounded-xl px-4 py-2">
          <span className="text-[15px] font-semibold">Juan Cruz</span>
          <Stepper label="goles de Juan Cruz" value={goals} onChange={setGoals} />
        </div>
      </Demo>

      <Demo title="Equipos y resultado" note="TeamColumns (con MVP) y ResultSummary (goles, en contra, sin autor, asistencias, MVP, notas).">
        <TeamColumns match={DETAIL} mvpId="p1" />
        <ResultSummary match={DETAIL} />
      </Demo>

      <Demo title="Importar lista de WhatsApp" note="Pegá una lista: reconocidos, dudosos (elegir) y nuevos (crear ficha o ignorar). Plantel: Juanchi, Manu, Vece, Toto, Tota.">
        <LineupImport
          roster={ROSTER}
          onApply={(result) => toast.success(`Demo: ${result.entries.length} convocados, ${result.aliases.length} alias.`)}
        />
      </Demo>
    </section>
  );
}
