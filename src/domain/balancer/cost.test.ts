import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHTS, evaluateSplit, GOALKEEPERS_SAME_TEAM_PENALTY, resolveWeights } from "./cost";
import type { BalancerPlayer, Position } from "./types";

const player = (id: string, skill: number, extra: Partial<BalancerPlayer> = {}): BalancerPlayer => ({
  id,
  name: id.toUpperCase(),
  skill,
  primary: null,
  ...extra,
});

const six = [8, 7, 6, 5, 4, 3].map((s, i) => player(`p${i}`, s));

describe("pesos", () => {
  it("documenta los pesos por defecto", () => {
    expect(DEFAULT_WEIGHTS).toEqual({ level: 10, positions: 1, form: 3, uncertainty: 0.25, repetition: 1 });
  });

  it("combina pesos parciales e ignora valores inválidos", () => {
    expect(resolveWeights({ level: 2, form: -1, uncertainty: Number.NaN })).toEqual({ ...DEFAULT_WEIGHTS, level: 2 });
  });
});

describe("nivel", () => {
  it("normaliza la diferencia de sumas por el tamaño de equipo", () => {
    // A = 8 + 5 + 4 = 17, B = 7 + 6 + 3 = 16 → 1 / 3 por jugador
    const { cost, metrics } = evaluateSplit(six, ["p0", "p3", "p4"], ["p1", "p2", "p5"]);
    expect(metrics.sumA).toBe(17);
    expect(metrics.sumB).toBe(16);
    expect(metrics.levelDiff).toBeCloseTo(1 / 3);
    expect(metrics.levelDiffPct).toBeCloseTo((1 / 16.5) * 100);
    expect(cost).toBeCloseTo(10 / 3);
  });

  it("es simétrico: intercambiar equipos no cambia el costo", () => {
    const x = evaluateSplit(six, ["p0", "p1", "p5"], ["p2", "p3", "p4"]);
    const y = evaluateSplit(six, ["p2", "p3", "p4"], ["p0", "p1", "p5"]);
    expect(x.cost).toBeCloseTo(y.cost);
  });

  it("con cantidad impar compara sumas: el equipo corto puede tener mejor promedio", () => {
    const seven = [5, 5, 5, 5, 7, 7, 6].map((s, i) => player(`p${i}`, s));
    const { cost, metrics } = evaluateSplit(seven, ["p0", "p1", "p2", "p3"], ["p4", "p5", "p6"]);
    expect(metrics.sumA).toBe(20);
    expect(metrics.sumB).toBe(20);
    expect(metrics.avgB).toBeGreaterThan(metrics.avgA);
    expect(metrics.levelDiff).toBe(0);
    expect(cost).toBe(0);
  });
});

describe("posiciones", () => {
  const withPositions = (positions: Array<[Position | null, Position | null]>) =>
    positions.map(([primary, secondary], i) => player(`p${i}`, 5, { primary, secondary }));

  it("penaliza fuerte a dos arqueros en el mismo equipo", () => {
    const ps = withPositions([
      ["goalkeeper", null],
      ["goalkeeper", null],
      [null, null],
      [null, null],
      [null, null],
      [null, null],
    ]);
    const together = evaluateSplit(ps, ["p0", "p1", "p2"], ["p3", "p4", "p5"]);
    const split = evaluateSplit(ps, ["p0", "p2", "p3"], ["p1", "p4", "p5"]);
    expect(together.cost).toBe(GOALKEEPERS_SAME_TEAM_PENALTY + 2);
    expect(together.metrics.gkA).toBe(2);
    expect(split.cost).toBe(0);
    expect(split.metrics.gkA).toBe(1);
    expect(split.metrics.gkB).toBe(1);
  });

  it("con un solo arquero no hay penalización fuerte", () => {
    const ps = withPositions([["goalkeeper", null], ...Array.from({ length: 5 }, () => [null, null] as [null, null])]);
    expect(evaluateSplit(ps, ["p0", "p1", "p2"], ["p3", "p4", "p5"]).cost).toBe(1);
  });

  it("la posición secundaria cuenta 0,5", () => {
    const ps = withPositions([
      ["defender", "forward"],
      ["defender", null],
      [null, null],
      ["forward", null],
      [null, null],
      [null, null],
    ]);
    const { cost, metrics } = evaluateSplit(ps, ["p0", "p2", "p4"], ["p1", "p3", "p5"]);
    expect(metrics.positionCounts.a).toEqual({ goalkeeper: 0, defender: 1, midfielder: 0, forward: 0.5 });
    expect(metrics.positionCounts.b).toEqual({ goalkeeper: 0, defender: 1, midfielder: 0, forward: 1 });
    expect(cost).toBeCloseTo(0.5);
  });

  it("suma defensas, mediocampistas y delanteros desparejos", () => {
    const ps = withPositions([
      ["defender", null],
      ["defender", null],
      ["midfielder", null],
      ["forward", null],
      ["forward", null],
      [null, null],
    ]);
    // A: DEF 2, MED 1 · B: DEL 2 → 2 + 1 + 2
    expect(evaluateSplit(ps, ["p0", "p1", "p2"], ["p3", "p4", "p5"]).cost).toBe(5);
  });
});

describe("forma, incertidumbre y repetición", () => {
  it("compara la forma reciente por suma normalizada", () => {
    const ps = six.map((p, i) => ({ ...p, skill: 5, form: i === 0 ? 0.6 : 0 }));
    const { cost, metrics } = evaluateSplit(ps, ["p0", "p1", "p2"], ["p3", "p4", "p5"]);
    expect(metrics.formDiff).toBeCloseTo(0.2);
    expect(cost).toBeCloseTo(3 * 0.2);
  });

  it("no concentra desconocidos: compara Σσ²", () => {
    const ps = six.map((p, i) => ({ ...p, skill: 5, sigma: i < 2 ? 2 : 0 }));
    const together = evaluateSplit(ps, ["p0", "p1", "p2"], ["p3", "p4", "p5"]);
    const split = evaluateSplit(ps, ["p0", "p2", "p3"], ["p1", "p4", "p5"]);
    expect(together.metrics.uncertaintyDiff).toBe(8);
    expect(together.cost).toBe(2);
    expect(split.cost).toBe(0);
  });

  it("penaliza repetir los equipos anteriores sin importar el color", () => {
    const ps = six.map((p) => ({ ...p, skill: 5 }));
    const previousTeams = { a: ["p0", "p1", "p2"], b: ["p3", "p4", "p5"] };
    const same = evaluateSplit(ps, ["p0", "p1", "p2"], ["p3", "p4", "p5"], { previousTeams });
    const mirrored = evaluateSplit(ps, ["p3", "p4", "p5"], ["p0", "p1", "p2"], { previousTeams });
    const mixed = evaluateSplit(ps, ["p0", "p3", "p4"], ["p1", "p2", "p5"], { previousTeams });
    expect(same.cost).toBe(1);
    expect(same.metrics.repetitionOverlap).toBe(1);
    expect(same.metrics.repetitionChanges).toBe(0);
    expect(mirrored.cost).toBe(1);
    expect(mixed.metrics.repetitionChanges).toBe(2);
    expect(mixed.cost).toBeCloseTo(1 / 3);
  });

  it("sin equipos previos la repetición es null", () => {
    const { metrics } = evaluateSplit(six, ["p0", "p1", "p2"], ["p3", "p4", "p5"]);
    expect(metrics.repetitionOverlap).toBeNull();
    expect(metrics.repetitionChanges).toBeNull();
  });

  it("respeta pesos personalizados", () => {
    const { cost } = evaluateSplit(six, ["p0", "p3", "p4"], ["p1", "p2", "p5"], { weights: { level: 3 } });
    expect(cost).toBeCloseTo(1);
  });
});
