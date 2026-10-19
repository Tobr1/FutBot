import { describe, expect, it } from "vitest";
import { balanceTeams, explainSplit } from "@/domain/balancer";
import { confidenceFor, sigmaFor } from "@/domain/rating";
import {
  assignmentFromSplit,
  choosePreviousTeams,
  formatWinProbability,
  matchesSplit,
  mergeConstraints,
  NEW_PLAYER_SIGMA,
  pairKey,
  pinsAfterMove,
  pinsKey,
  roundProbabilities,
  shareOf,
  type TeamRule,
  teamForecast,
  toBalancerPlayer,
  togglePin,
  UNKNOWN_SIGMA,
} from "./team-generator";

const source = (id: string, baseRating = 6, primary: "goalkeeper" | "defender" | "midfielder" | "forward" | null = "midfielder") => ({
  id,
  nickname: id.toUpperCase(),
  baseRating,
  positions: { primary, secondary: null },
});

const rule = (id: string, playerA: string, playerB: string, kind: TeamRule["kind"]): TeamRule => ({
  id,
  playerA,
  playerB,
  kind,
  note: null,
});

describe("toBalancerPlayer", () => {
  it("usa la habilidad, σ y forma del motor", () => {
    const p = toBalancerPlayer(
      { id: "x", nickname: "Brito", baseRating: 5, positions: { primary: "defender", secondary: "midfielder" } },
      { skill: 7.2, sigma: 0.6, recentForm: 0.4 },
    );
    expect(p).toEqual({ id: "x", name: "Brito", skill: 7.2, sigma: 0.6, form: 0.4, primary: "defender", secondary: "midfielder" });
  });

  it("sin datos del motor cae al nivel inicial con incertidumbre máxima y sin forma", () => {
    const p = toBalancerPlayer(source("x", 5.5));
    expect(p.skill).toBe(5.5);
    expect(p.sigma).toBe(UNKNOWN_SIGMA);
    expect(p.form).toBe(0);
  });

  it("forma reciente null o habilidad inválida no rompen", () => {
    expect(toBalancerPlayer(source("x"), { skill: 6.4, sigma: 1, recentForm: null }).form).toBe(0);
    expect(toBalancerPlayer(source("x", 4), { skill: Number.NaN, sigma: 1, recentForm: 2 })).toMatchObject({ skill: 4, form: 0 });
  });

  it("descarta una secundaria igual a la principal", () => {
    const p = toBalancerPlayer({ ...source("x"), positions: { primary: "forward", secondary: "forward" } });
    expect(p.secondary).toBeNull();
  });
});

describe("NEW_PLAYER_SIGMA", () => {
  it("marca como nuevos a los que tienen menos de 3 partidos, como el distintivo Provisional", () => {
    expect(sigmaFor(confidenceFor(0))).toBeGreaterThanOrEqual(NEW_PLAYER_SIGMA);
    expect(sigmaFor(confidenceFor(2))).toBeGreaterThanOrEqual(NEW_PLAYER_SIGMA);
    expect(sigmaFor(confidenceFor(3))).toBeLessThan(NEW_PLAYER_SIGMA);
  });
});

describe("mergeConstraints", () => {
  const ids = ["a", "b", "c", "d", "e", "f"];
  const names = Object.fromEntries(ids.map((id) => [id, id.toUpperCase()]));

  it("solo aplica reglas con los dos jugadores convocados y sin repetir parejas", () => {
    const merged = mergeConstraints({
      rules: [rule("1", "a", "b", "together"), rule("2", "b", "a", "together"), rule("3", "c", "z", "apart"), rule("4", "d", "e", "apart")],
      pins: {},
      playerIds: ids,
      names,
    });
    expect(merged.activeRules.map((r) => r.id)).toEqual(["1", "4"]);
    expect(merged.constraints).toEqual({ together: [["a", "b"]], apart: [["d", "e"]] });
    expect(merged.conflicts).toEqual([]);
  });

  it("descarta fijados de jugadores que no están", () => {
    const merged = mergeConstraints({ rules: [], pins: { a: "a", z: "b" }, playerIds: ids });
    expect(merged.constraints).toEqual({ pinned: { a: "a" } });
  });

  it("sin nada devuelve restricciones vacías", () => {
    expect(mergeConstraints({ rules: [], pins: {}, playerIds: ids }).constraints).toEqual({});
  });

  it("detecta juntos fijados en equipos distintos", () => {
    const merged = mergeConstraints({ rules: [rule("1", "a", "b", "together")], pins: { a: "a", b: "b" }, playerIds: ids, names });
    expect(merged.conflicts).toEqual(["A y B tienen que jugar juntos, pero están fijados en equipos distintos."]);
  });

  it("detecta separados fijados en el mismo equipo, con el nombre del equipo", () => {
    const merged = mergeConstraints({
      rules: [rule("1", "a", "b", "apart")],
      pins: { a: "b", b: "b" },
      playerIds: ids,
      names,
      teamNames: { a: "Azul", b: "Rojo" },
    });
    expect(merged.conflicts).toEqual(["A y B tienen que jugar separados, pero los dos están fijados en Rojo."]);
  });

  it("detecta la misma pareja juntos y separados", () => {
    const merged = mergeConstraints({
      rules: [rule("1", "a", "b", "together"), rule("2", "b", "a", "apart")],
      pins: {},
      playerIds: ids,
      names,
    });
    expect(merged.conflicts).toEqual(["B y A tienen una regla de juntos y otra de separados."]);
  });

  it("las restricciones sin conflictos las cumple el optimizador", () => {
    const players = ids.map((id, i) => toBalancerPlayer(source(id, 4 + i)));
    const { constraints } = mergeConstraints({
      rules: [rule("1", "a", "f", "together"), rule("2", "b", "c", "apart")],
      pins: { d: "b" },
      playerIds: ids,
    });
    const result = balanceTeams(players, constraints);
    expect(result.violations).toEqual([]);
    for (const alt of result.alternatives) {
      const side = assignmentFromSplit(alt);
      expect(side.a).toBe(side.f);
      expect(side.b).not.toBe(side.c);
      expect(side.d).toBe("b");
    }
  });
});

describe("fijados de la sesión", () => {
  it("togglePin fija en el equipo actual o suelta", () => {
    expect(togglePin({}, "x", "a")).toEqual({ x: "a" });
    expect(togglePin({ x: "a" }, "x", "a")).toEqual({});
    expect(togglePin({}, "x", null)).toEqual({});
  });

  it("pinsAfterMove: el fijado sigue al jugador y se suelta sin equipo", () => {
    expect(pinsAfterMove({ x: "a" }, "x", "b")).toEqual({ x: "b" });
    expect(pinsAfterMove({ x: "a" }, "x", null)).toEqual({});
    expect(pinsAfterMove({ x: "a" }, "y", "b")).toEqual({ x: "a" });
  });

  it("pinsKey no depende del orden", () => {
    expect(pinsKey({ b: "a", a: "b" })).toBe(pinsKey({ a: "b", b: "a" }));
    expect(pinsKey({})).toBe("");
  });

  it("pairKey no depende del orden", () => {
    expect(pairKey("x", "y")).toBe(pairKey("y", "x"));
  });
});

describe("choosePreviousTeams", () => {
  const lines = [
    { matchId: "m1", playerId: "a", side: "a" as const, scheduledAt: "2026-10-01T22:00:00Z" },
    { matchId: "m1", playerId: "b", side: "b" as const, scheduledAt: "2026-10-01T22:00:00Z" },
    { matchId: "m2", playerId: "a", side: "b" as const, scheduledAt: "2026-10-08T22:00:00Z" },
    { matchId: "m2", playerId: "c", side: "a" as const, scheduledAt: "2026-10-08T22:00:00Z" },
    { matchId: "m2", playerId: "b", side: "b" as const, scheduledAt: "2026-10-08T22:00:00Z" },
  ];

  it("elige el último partido jugado", () => {
    expect(choosePreviousTeams(lines)).toEqual({ matchId: "m2", a: ["c"], b: ["a", "b"] });
  });

  it("ignora el partido que se está armando", () => {
    expect(choosePreviousTeams(lines, { excludeMatchId: "m2" })?.matchId).toBe("m1");
  });

  it("con `before` ignora los posteriores (corregir un partido viejo)", () => {
    expect(choosePreviousTeams(lines, { before: "2026-10-08T22:00:00Z" })?.matchId).toBe("m1");
    expect(choosePreviousTeams(lines, { before: "2026-10-01T22:00:00Z" })).toBeUndefined();
  });

  it("sin partidos no hay equipos previos", () => {
    expect(choosePreviousTeams([])).toBeUndefined();
  });

  it("los equipos previos activan la variedad en la explicación", () => {
    const players = ["a", "b", "c", "d", "e", "f"].map((id) => toBalancerPlayer(source(id)));
    const previous = choosePreviousTeams([
      ...["a", "b", "c"].map((playerId) => ({ matchId: "m", playerId, side: "a" as const, scheduledAt: "2026-10-01T00:00:00Z" })),
      ...["d", "e", "f"].map((playerId) => ({ matchId: "m", playerId, side: "b" as const, scheduledAt: "2026-10-01T00:00:00Z" })),
    ]);
    const result = balanceTeams(players, {}, { previousTeams: previous });
    const lines = explainSplit(result.alternatives[0], players);
    expect(lines.some((l) => l.startsWith("Equipos distintos al último partido"))).toBe(true);
  });
});

describe("alternativas", () => {
  it("assignmentFromSplit y matchesSplit", () => {
    const split = { a: ["x", "y"], b: ["z"] };
    expect(assignmentFromSplit(split)).toEqual({ x: "a", y: "a", z: "b" });
    expect(matchesSplit({ x: "a", y: "a", z: "b" }, split)).toBe(true);
    expect(matchesSplit({ x: "a", y: "b", z: "b" }, split)).toBe(false);
    expect(matchesSplit({ x: "a", y: "a", z: "b", w: "a" }, split)).toBe(false);
    expect(matchesSplit({ x: "a", y: "a", z: "b", w: null }, split)).toBe(true);
  });

  it("shareOf", () => {
    expect(shareOf({ sumA: 30, sumB: 30 })).toBe(0.5);
    expect(shareOf({ sumA: 0, sumB: 0 })).toBe(0.5);
    expect(shareOf({ sumA: 30, sumB: 10 })).toBe(0.75);
  });
});

describe("pronóstico", () => {
  it("redondea a enteros que suman 100", () => {
    expect(roundProbabilities({ a: 0.547, draw: 0.224, b: 0.229 })).toEqual({ a: 55, draw: 22, b: 23 });
    const r = roundProbabilities({ a: 1 / 3, draw: 1 / 3, b: 1 / 3 });
    expect(r.a + r.draw + r.b).toBe(100);
    expect(roundProbabilities({ a: 0, draw: 0, b: 0 })).toEqual({ a: 33, draw: 34, b: 33 });
  });

  it("formatea con los nombres de los equipos", () => {
    expect(formatWinProbability({ a: 0.54, draw: 0.22, b: 0.24 }, { a: "Azul", b: "Rojo" })).toBe(
      "Azul 54 % · Empate 22 % · Rojo 24 %",
    );
  });

  it("teamForecast usa la habilidad de cada uno y favorece al más fuerte", () => {
    const skill: Record<string, number> = { a: 8, b: 7, c: 5, d: 4 };
    const p = teamForecast({ a: ["a", "b"], b: ["c", "d"] }, (id) => skill[id])!;
    expect(p.a).toBeGreaterThan(p.b);
    expect(p.a + p.draw + p.b).toBeCloseTo(1, 9);
    expect(teamForecast({ a: [], b: ["c"] }, (id) => skill[id])).toBeNull();
  });

  it("equipos iguales: misma probabilidad para los dos", () => {
    const p = teamForecast({ a: ["a"], b: ["b"] }, () => 6)!;
    expect(p.a).toBeCloseTo(p.b, 9);
  });
});
