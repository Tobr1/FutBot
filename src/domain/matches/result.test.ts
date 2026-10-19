import { describe, expect, it } from "vitest";
import {
  checkResult,
  clampScore,
  draftToEvents,
  eventsToDraft,
  outcome,
  ownGoalBeneficiary,
  pruneDraft,
  type ResultDraft,
  type Side,
  sideResult,
  summarizeEvents,
} from "./result";

const TEAMS: Record<string, Side> = { ana: "a", beto: "a", caro: "a", dani: "b", eze: "b", fede: "b" };
const sideOf = (id: string) => TEAMS[id] ?? null;

const draft = (partial: Partial<ResultDraft>): ResultDraft => ({
  scoreA: 0,
  scoreB: 0,
  goals: {},
  assists: {},
  ownGoals: [],
  ...partial,
});

describe("outcome", () => {
  it("define ganador o empate", () => {
    expect(outcome(3, 2)).toBe("a");
    expect(outcome(0, 1)).toBe("b");
    expect(outcome(2, 2)).toBe("draw");
  });

  it("da el resultado desde cada equipo", () => {
    expect(sideResult("a", 3, 2)).toBe("win");
    expect(sideResult("b", 3, 2)).toBe("loss");
    expect(sideResult("b", 1, 1)).toBe("draw");
  });

  it("acredita el gol en contra al rival", () => {
    expect(ownGoalBeneficiary("a")).toBe("b");
    expect(ownGoalBeneficiary("b")).toBe("a");
  });

  it("limita el marcador a 0–99", () => {
    expect(clampScore(-1)).toBe(0);
    expect(clampScore(120)).toBe(99);
    expect(clampScore(3.7)).toBe(3);
    expect(clampScore(Number.NaN)).toBe(0);
  });
});

describe("checkResult", () => {
  it("acepta goles sin autor (el marcador manda)", () => {
    const check = checkResult(draft({ scoreA: 3, scoreB: 1, goals: { ana: 1 } }), sideOf);
    expect(check.valid).toBe(true);
    expect(check.a).toMatchObject({ credited: 1, unassigned: 2 });
    expect(check.b).toMatchObject({ credited: 0, unassigned: 1 });
  });

  it("rechaza más goles asignados que el marcador", () => {
    const check = checkResult(draft({ scoreA: 1, goals: { ana: 1, beto: 1 } }), sideOf);
    expect(check.valid).toBe(false);
    expect(check.issues).toContainEqual({ kind: "goals_exceed_score", side: "a" });
    expect(check.a.unassigned).toBe(0);
  });

  it("cuenta los goles en contra para el equipo beneficiado", () => {
    const check = checkResult(
      draft({ scoreA: 2, goals: { ana: 1 }, ownGoals: [{ beneficiary: "a", playerId: "dani" }] }),
      sideOf,
    );
    expect(check.valid).toBe(true);
    expect(check.a).toMatchObject({ playerGoals: 1, ownGoalsFor: 1, credited: 2, unassigned: 0 });
  });

  it("un gol en contra sin autor también ocupa marcador", () => {
    const check = checkResult(draft({ scoreB: 0, ownGoals: [{ beneficiary: "b", playerId: null }] }), sideOf);
    expect(check.issues).toContainEqual({ kind: "goals_exceed_score", side: "b" });
  });

  it("rechaza un gol en contra de alguien del equipo beneficiado", () => {
    const check = checkResult(draft({ scoreA: 1, ownGoals: [{ beneficiary: "a", playerId: "ana" }] }), sideOf);
    expect(check.issues).toContainEqual({ kind: "own_goal_wrong_team", playerId: "ana" });
  });

  it("las asistencias no superan a los goles de jugadores del equipo", () => {
    const ok = checkResult(draft({ scoreA: 2, goals: { ana: 2 }, assists: { beto: 1, caro: 1 } }), sideOf);
    expect(ok.valid).toBe(true);

    // Un gol en contra no habilita asistencias (igual que la RPC).
    const bad = checkResult(
      draft({ scoreA: 1, assists: { beto: 1 }, ownGoals: [{ beneficiary: "a", playerId: "eze" }] }),
      sideOf,
    );
    expect(bad.issues).toContainEqual({ kind: "assists_exceed_goals", side: "a" });
  });

  it("detecta jugadores que no están en los equipos", () => {
    const check = checkResult(draft({ scoreA: 1, goals: { zoe: 1 } }), sideOf);
    expect(check.issues).toContainEqual({ kind: "player_not_in_match", playerId: "zoe" });
  });

  it("ignora contadores en cero", () => {
    expect(checkResult(draft({ goals: { zoe: 0 } }), sideOf).valid).toBe(true);
  });
});

describe("eventos", () => {
  const sample = draft({
    scoreA: 3,
    scoreB: 1,
    goals: { beto: 1, ana: 1 },
    assists: { caro: 1 },
    ownGoals: [
      { beneficiary: "a", playerId: "dani" },
      { beneficiary: "b", playerId: null },
    ],
  });

  it("arma los eventos para la RPC en orden estable", () => {
    expect(draftToEvents(sample)).toEqual([
      { event_type: "goal", player_id: "ana" },
      { event_type: "goal", player_id: "beto" },
      { event_type: "own_goal", player_id: "dani" },
      { event_type: "own_goal", team_side: "b" },
      { event_type: "assist", player_id: "caro" },
    ]);
  });

  it("repite el evento por cada gol", () => {
    expect(draftToEvents(draft({ goals: { ana: 3 } }))).toHaveLength(3);
  });

  it("vuelve de los eventos guardados al borrador", () => {
    const back = eventsToDraft(3, 1, [
      { type: "goal", playerId: "ana", side: "a" },
      { type: "goal", playerId: "ana", side: "a" },
      { type: "assist", playerId: "caro", side: "a" },
      { type: "own_goal", playerId: "dani", side: "a" },
      { type: "own_goal", playerId: null, side: "b" },
    ]);
    expect(back).toEqual({
      scoreA: 3,
      scoreB: 1,
      goals: { ana: 2 },
      assists: { caro: 1 },
      ownGoals: [
        { beneficiary: "a", playerId: "dani" },
        { beneficiary: "b", playerId: null },
      ],
    });
  });

  it("sin marcador previo arranca en 0–0", () => {
    expect(eventsToDraft(null, null, [])).toMatchObject({ scoreA: 0, scoreB: 0 });
  });
});

describe("summarizeEvents", () => {
  it("agrupa goleadores y asistidores por equipo y cuenta los goles sin autor", () => {
    const names: Record<string, string> = { ana: "Ana", beto: "Beto", caro: "Caro", dani: "Dani" };
    const summary = summarizeEvents(
      4,
      0,
      [
        { type: "goal", playerId: "beto", side: "a" },
        { type: "goal", playerId: "ana", side: "a" },
        { type: "goal", playerId: "ana", side: "a" },
        { type: "assist", playerId: "caro", side: "a" },
      ],
      (id) => names[id],
    );
    expect(summary.a.scorers).toEqual([
      { playerId: "ana", count: 2 },
      { playerId: "beto", count: 1 },
    ]);
    expect(summary.a.assisters).toEqual([{ playerId: "caro", count: 1 }]);
    expect(summary.a.unassigned).toBe(1);
    expect(summary.b).toEqual({ scorers: [], assisters: [], ownGoals: [], unassigned: 0 });
  });

  it("muestra los goles en contra en el equipo beneficiado", () => {
    const summary = summarizeEvents(1, 0, [{ type: "own_goal", playerId: "dani", side: "a" }]);
    expect(summary.a.ownGoals).toEqual([{ playerId: "dani" }]);
    expect(summary.a.unassigned).toBe(0);
  });
});

describe("pruneDraft", () => {
  it("descarta ceros y jugadores que ya no juegan", () => {
    const pruned = pruneDraft(
      draft({
        goals: { ana: 1, beto: 0, zoe: 2 },
        assists: { caro: 1 },
        ownGoals: [
          { beneficiary: "a", playerId: "dani" },
          { beneficiary: "a", playerId: "beto" },
          { beneficiary: "b", playerId: null },
        ],
      }),
      sideOf,
    );
    expect(pruned.goals).toEqual({ ana: 1 });
    expect(pruned.assists).toEqual({ caro: 1 });
    expect(pruned.ownGoals).toEqual([
      { beneficiary: "a", playerId: "dani" },
      { beneficiary: "b", playerId: null },
    ]);
  });
});
