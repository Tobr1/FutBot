"use client";

import type { MouseEvent, ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NextMatchCard } from "@/features/groups/components/next-match-card";
import { AttendanceCard } from "@/features/matches/components/attendance-card";
import { LineupImport } from "@/features/matches/components/lineup-import";
import { MatchCard } from "@/features/matches/components/match-card";
import { ResultSummary, TeamColumns } from "@/features/matches/components/match-detail";
import { MatchCardSkeleton } from "@/features/matches/components/match-skeletons";
import { MatchStatusBadge } from "@/features/matches/components/match-status-badge";
import { ResultEditor } from "@/features/matches/components/result-editor";
import { PredictionCard } from "@/features/predictions/components/prediction-card";
import { Stepper } from "@/features/matches/components/stepper";
import { TeamBuilder } from "@/features/matches/components/team-builder";
import { WhatsAppCallButton } from "@/features/matches/components/whatsapp-call-button";
import type { MatchDetail, MatchListItem, MatchParticipant } from "@/features/matches/queries";
import { GeneratorIssues, GeneratorPanel } from "@/features/teams/components/generator-panel";
import { TeamRuleList } from "@/features/teams/components/team-rules";
import { ForecastCard } from "@/features/teams/components/win-probability";
import { type BalancerPlayer, balanceTeams } from "@/domain/balancer";
import { matchesSplit, mergeConstraints, type TeamRule, teamForecast } from "@/domain/matches/team-generator";

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

/* Generador de equipos con datos fijos: el optimizador es determinista. */
const GEN_PLAYERS: BalancerPlayer[] = [
  { id: "p1", name: "Juan Cruz", skill: 8.4, sigma: 0.5, form: 0.3, primary: "forward", secondary: "midfielder" },
  { id: "p2", name: "Tano", skill: 7.1, sigma: 0.6, form: -0.2, primary: "goalkeeper", secondary: null },
  { id: "p3", name: "Ruso", skill: 6, sigma: 0.7, form: 0, primary: "defender", secondary: null },
  { id: "p4", name: "Pato", skill: 5.5, sigma: 1.5, form: 0, primary: "midfielder", secondary: null },
  { id: "p5", name: "Vece", skill: 5, sigma: 0.8, form: 0.4, primary: "defender", secondary: "midfielder" },
  { id: "p6", name: "Manu", skill: 7.8, sigma: 0.5, form: 0.1, primary: "midfielder", secondary: "forward" },
  { id: "p7", name: "Toto", skill: 6.6, sigma: 0.6, form: -0.4, primary: "goalkeeper", secondary: null },
  { id: "p8", name: "Maximiliano Gutiérrez", skill: 6.2, sigma: 1.5, form: 0, primary: "forward", secondary: null },
  { id: "p9", name: "Fede", skill: 5.1, sigma: 0.9, form: 0.2, primary: "defender", secondary: null },
  { id: "p10", name: "Lucho", skill: 4.9, sigma: 0.7, form: -0.1, primary: "midfielder", secondary: "defender" },
];
const GEN_NAMES = { a: "Azul", b: "Rojo" };
const GEN_RULES: TeamRule[] = [
  { id: "r1", playerA: "p1", playerB: "p6", kind: "apart", note: "Los dos cracks, uno por lado" },
  { id: "r2", playerA: "p4", playerB: "p9", kind: "together", note: null },
];
const GEN_PINS = { p3: "a" } as const;
const GEN_MERGED = mergeConstraints({
  rules: GEN_RULES,
  pins: GEN_PINS,
  playerIds: GEN_PLAYERS.map((p) => p.id),
  names: Object.fromEntries(GEN_PLAYERS.map((p) => [p.id, p.name])),
  teamNames: GEN_NAMES,
});
const GEN_RESULT = balanceTeams(GEN_PLAYERS, GEN_MERGED.constraints, {
  previousTeams: { a: ["p1", "p2", "p3", "p4", "p5"], b: ["p6", "p7", "p8", "p9", "p10"] },
});
const GEN_VIEW = Object.fromEntries(GEN_PLAYERS.map((p) => [p.id, { id: p.id, nickname: p.name, avatarUrl: null }]));
const GEN_SKILL = new Map(GEN_PLAYERS.map((p) => [p.id, p.skill]));
const GEN_FORECAST = teamForecast(GEN_RESULT.alternatives[0], (id) => GEN_SKILL.get(id))!;

function GeneratorDemo() {
  const [index, setIndex] = useState(0);
  const [applied, setApplied] = useState<Record<string, "a" | "b">>({});
  const appliedIndex = GEN_RESULT.alternatives.findIndex((alt) => matchesSplit(applied, alt));
  return (
    <GeneratorPanel
      result={GEN_RESULT}
      index={index}
      onIndexChange={setIndex}
      onApply={(split) => {
        setApplied(Object.fromEntries([...split.a.map((id) => [id, "a" as const]), ...split.b.map((id) => [id, "b" as const])]));
        toast.success("Demo: equipos aplicados al armado.");
      }}
      players={GEN_VIEW}
      balancerPlayers={GEN_PLAYERS}
      constraints={GEN_MERGED.constraints}
      teamNames={GEN_NAMES}
      pins={GEN_PINS}
      appliedIndex={appliedIndex >= 0 ? appliedIndex : null}
      onClose={() => toast("Demo: cerrar alternativas.")}
    />
  );
}

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
        <ul className="grid grid-cols-1 gap-2 lg:grid-cols-2">
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
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <NextMatchCard slug="demo" featured={{ kind: "next", match: CARDS[0].match }} timeZone={TZ} today={TODAY} nowMs={NOW_MS} isAdmin />
          <NextMatchCard slug="demo" featured={{ kind: "last", match: CARDS[4].match }} timeZone={TZ} today={TODAY} nowMs={NOW_MS} isAdmin />
          <NextMatchCard slug="demo" featured={null} timeZone={TZ} today={TODAY} nowMs={NOW_MS} isAdmin />
          <NextMatchCard slug="demo" featured={null} timeZone={TZ} today={TODAY} nowMs={NOW_MS} isAdmin={false} />
        </div>
      </Demo>

      <Demo title="Voy / No voy" note="AttendanceCard: sin responder, confirmado, suplente y sin ficha. El botón de WhatsApp (solo admin) arma la convocatoria para el grupo.">
        <div className="grid gap-3 lg:grid-cols-2">
          <AttendanceCard matchId="00000000-0000-4000-8000-000000000001" attendance={{ kind: "none" }} free={3} />
          <AttendanceCard matchId="00000000-0000-4000-8000-000000000001" attendance={{ kind: "confirmed" }} free={2} />
          <AttendanceCard matchId="00000000-0000-4000-8000-000000000001" attendance={{ kind: "reserve", position: 2 }} free={0} />
          <AttendanceCard matchId="00000000-0000-4000-8000-000000000001" attendance={{ kind: "none" }} free={3} claimHref="#" />
          <WhatsAppCallButton
            path="/g/demo/partidos/1"
            message={{
              groupName: "Los del Sábado",
              whenLabel: "Sáb 25/10 · 22:00",
              venue: "La Canchita",
              confirmed: ["Brito", "Manu", "Vece"],
              reserves: [],
              capacity: 10,
            }}
          />
        </div>
      </Demo>
      <Demo title="Pronósticos" note="PredictionCard: abierto (antes del inicio, con equipos armados) y cerrado con resultado 3–1 y puntos de cada uno.">
        <div className="grid gap-3 lg:grid-cols-2">
          <PredictionCard matchId="00000000-0000-4000-8000-000000000002" teams={{ a: "Azul", b: "Rojo" }} mine={null} count={4} phase="open" entries={[]} result={null} myProfileId="yo" standingsHref="#" />
          <PredictionCard
            matchId="00000000-0000-4000-8000-000000000002"
            teams={{ a: "Azul", b: "Rojo" }}
            mine={{ a: 3, b: 1 }}
            count={3}
            phase="locked"
            result={{ a: 3, b: 1 }}
            myProfileId="yo"
            standingsHref="#"
            entries={[
              { profileId: "yo", name: "Brito", avatarUrl: null, prediction: { a: 3, b: 1 } },
              { profileId: "m", name: "Manu", avatarUrl: null, prediction: { a: 2, b: 0 } },
              { profileId: "v", name: "Vece", avatarUrl: null, prediction: { a: 1, b: 2 } },
            ]}
          />
        </div>
      </Demo>
      <Demo title="Cargar resultado" note="ResultEditor: cada gol del marcador tiene que estar asignado o marcado sin autor; si no, no se guarda. Acá Azul tiene 3 y solo hay 2 asignados.">
        <div className="max-w-2xl">
          <ResultEditor
            groupId="00000000-0000-4000-8000-000000000001"
            matchId="00000000-0000-4000-8000-000000000002"
            isCorrection={false}
            initialMvp={null}
            initialNotes=""
            initial={{ scoreA: 3, scoreB: 1, goals: { r1: 2, r4: 1 }, assists: {}, ownGoals: [], unknown: { a: 0, b: 0 } }}
            teams={{
              a: { name: "Azul", members: [{ id: "r1", nickname: "Brito", avatarUrl: null }, { id: "r2", nickname: "Manu", avatarUrl: null }] },
              b: { name: "Rojo", members: [{ id: "r3", nickname: "Vece", avatarUrl: null }, { id: "r4", nickname: "Paramo", avatarUrl: null }] },
            }}
          />
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

      <Demo
        title="Generar parejos"
        note="GeneratorPanel: 10 jugadores, Juan Cruz y Manu separados, Pato y Fede juntos, Ruso fijado en Azul. Flechas, Otra alternativa o deslizar."
      >
        <GeneratorDemo />
      </Demo>

      <Demo
        title="Armado completo"
        note="TeamBuilder con los mismos 10 jugadores: generar, fijar, reglas y edición manual. Guardar equipos o reglas falla a propósito (sin Supabase)."
      >
        <TeamBuilder
          groupId="00000000-0000-4000-8000-000000000000"
          matchId="00000000-0000-4000-8000-000000000001"
          players={GEN_PLAYERS.map((p) => ({ id: p.id, nickname: p.name, avatarUrl: null, rating: p.skill, position: p.primary }))}
          balancer={GEN_PLAYERS}
          rules={GEN_RULES}
          previousTeams={{ a: ["p1", "p2", "p3", "p4", "p5"], b: ["p6", "p7", "p8", "p9", "p10"] }}
          rulesHref="#"
          canEditRules
          initial={{}}
          initialNames={{ a: "Azul", b: "Rojo" }}
          finished={false}
        />
      </Demo>

      <Demo title="Restricciones imposibles" note="GeneratorIssues: qué pasa y cómo arreglarlo.">
        <GeneratorIssues
          messages={["Juan Cruz y Manu tienen que jugar separados, pero los dos están fijados en Azul."]}
          hint="Soltá algún jugador fijado o revisá las reglas de armado del grupo."
          actions={
            <Button type="button" variant="secondary" size="sm">
              Soltar fijados
            </Button>
          }
        />
      </Demo>

      <Demo title="Pronóstico" note="ForecastCard: partido con equipos armados y sin jugar (inicio del grupo y detalle).">
        <ForecastCard probability={GEN_FORECAST} names={GEN_NAMES} headingLevel="h3" />
      </Demo>

      <Demo title="Reglas de armado" note="TeamRuleList en solo lectura (los admins ven el botón de borrar).">
        <TeamRuleList
          groupId="demo"
          rules={GEN_RULES}
          players={Object.fromEntries(GEN_PLAYERS.map((p) => [p.id, { nickname: p.name, avatarUrl: null }]))}
          canEdit={false}
        />
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
