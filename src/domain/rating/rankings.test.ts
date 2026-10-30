import { describe, expect, it } from "vitest";
import { buildRankings, formatDecimal, formatSigned, type PlayerTotals } from "./rankings";
import type { PlayerRating, RatingResult } from "./types";

function rating(partial: Partial<PlayerRating>): PlayerRating {
  const skill = partial.skill ?? 5;
  const sigma = partial.sigma ?? 0.5;
  return {
    skill,
    confidence: 0.5,
    sigma,
    matches: 5,
    matchesWithVotes: 5,
    isProvisional: false,
    performanceAvg: null,
    consistency: null,
    recentForm: null,
    conservative: skill - sigma,
    history: [],
    ...partial,
  };
}

function result(byPlayer: Record<string, Partial<PlayerRating>>): RatingResult {
  return {
    byPlayer: Object.fromEntries(Object.entries(byPlayer).map(([id, r]) => [id, rating(r)])),
    byMatch: {},
    engineVersion: "v1",
  };
}

function totals(playerId: string, partial: Partial<PlayerTotals>): PlayerTotals {
  return { playerId, matches: 5, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, mvps: 0, ...partial };
}

const ids = (list: { entries: { playerId: string }[] }) => list.entries.map((e) => e.playerId);

describe("formato", () => {
  it("usa coma decimal y evita -0,0", () => {
    expect(formatDecimal(7.45)).toBe("7,5");
    expect(formatDecimal(7)).toBe("7,0");
    expect(formatDecimal(-0.01)).toBe("0,0");
    expect(formatSigned(0.84)).toBe("+0,8");
    expect(formatSigned(-0.34)).toBe("-0,3");
    expect(formatSigned(0.02)).toBe("0,0");
  });
});

describe("buildRankings · mejor jugador", () => {
  it("ordena por valoración conservadora, excluye a los que no llegan al mínimo y los cuenta", () => {
    const r = result({
      a: { skill: 8, sigma: 1.5, matches: 3 }, // 6.5
      b: { skill: 7.2, sigma: 0.5, matches: 12 }, // 6.7
      c: { skill: 9, sigma: 1.5, matches: 2 }, // no llega
      d: { skill: 5, matches: 0 }, // nunca jugó: no cuenta como excluido
    });
    const { best } = buildRankings(r, [], { minMatches: 3 });
    expect(ids(best)).toEqual(["b", "a"]);
    expect(best.excluded).toBe(1);
    expect(best.entries[0]).toEqual({ playerId: "b", value: 7.2 - 0.5, display: "67", matches: 12 });
  });

  it("desempata por habilidad, luego por partidos y por último por id", () => {
    const r = result({
      z: { skill: 7, sigma: 1, matches: 10 },
      y: { skill: 7.5, sigma: 1.5, matches: 4 },
      x: { skill: 7, sigma: 1, matches: 20 },
      w: { skill: 7, sigma: 1, matches: 20 },
    });
    expect(ids(buildRankings(r, [], { minMatches: 1 }).best)).toEqual(["y", "w", "x", "z"]);
  });
});

describe("buildRankings · totales", () => {
  const t = [
    totals("a", { matches: 10, goals: 8, assists: 2, mvps: 1 }),
    totals("b", { matches: 4, goals: 8, assists: 2, mvps: 1 }),
    totals("c", { matches: 1, goals: 0, assists: 5 }),
    totals("d", { matches: 6, goals: 12 }),
    totals("e", { matches: 0 }),
  ];

  it("goleadores por total, desempate por goles por partido y sin los que no hicieron goles", () => {
    const { scorers } = buildRankings(result({}), t, { minMatches: 3 });
    expect(ids(scorers)).toEqual(["d", "b", "a"]);
    expect(scorers.entries[0]).toEqual({ playerId: "d", value: 12, display: "12", matches: 6 });
    expect(scorers.excluded).toBe(1);
  });

  it("asistidores y MVP no exigen mínimo de partidos", () => {
    const rankings = buildRankings(result({}), t, { minMatches: 3 });
    expect(ids(rankings.assisters)).toEqual(["c", "b", "a"]);
    expect(ids(rankings.mvps)).toEqual(["b", "a"]);
  });

  it("a igual total y promedio, gana el de más partidos y después el id", () => {
    const { scorers } = buildRankings(
      result({}),
      [totals("q", { matches: 4, goals: 4 }), totals("p", { matches: 4, goals: 4 })],
      { minMatches: 1 },
    );
    expect(ids(scorers)).toEqual(["p", "q"]);
  });

  it("% de victorias = (PG + 0,5·PE) / PJ con mínimo de partidos", () => {
    const { winRate } = buildRankings(
      result({}),
      [
        totals("a", { matches: 4, wins: 3, draws: 0, losses: 1 }),
        totals("b", { matches: 8, wins: 5, draws: 2, losses: 1 }),
        totals("c", { matches: 2, wins: 2 }),
        totals("d", { matches: 4, wins: 2, draws: 2 }),
      ],
      { minMatches: 3 },
    );
    expect(ids(winRate)).toEqual(["b", "a", "d"]);
    expect(winRate.entries[0]).toEqual({ playerId: "b", value: 0.75, display: "75%", matches: 8 });
    expect(winRate.excluded).toBe(1);
  });
});

describe("buildRankings · rendimiento", () => {
  const r = result({
    a: { performanceAvg: 7.8, matchesWithVotes: 2, matches: 6, consistency: null, recentForm: null },
    b: { performanceAvg: 7.1, matchesWithVotes: 6, matches: 6, consistency: 80, recentForm: 0.84 },
    c: { performanceAvg: 7.1, matchesWithVotes: 9, matches: 9, consistency: 92.4, recentForm: -0.3 },
    d: { performanceAvg: null, matchesWithVotes: 0, matches: 4 },
  });

  it("mejor promedio exige el mínimo de partidos con votos y desempata por partidos con votos", () => {
    const { bestAverage } = buildRankings(r, [], { minMatches: 3 });
    expect(ids(bestAverage)).toEqual(["c", "b"]);
    expect(bestAverage.entries[0]).toEqual({ playerId: "c", value: 7.1, display: "7,1", matches: 9 });
    expect(bestAverage.excluded).toBe(2);
    expect(ids(buildRankings(r, [], { minMatches: 3, minVotedMatches: 2 }).bestAverage)).toEqual(["a", "c", "b"]);
  });

  it("más regular usa la regularidad 0-100 y omite a quien no tiene el dato", () => {
    const { mostRegular } = buildRankings(r, [], { minMatches: 3 });
    expect(ids(mostRegular)).toEqual(["c", "b"]);
    expect(mostRegular.entries[0].display).toBe("92");
    expect(mostRegular.excluded).toBe(2);
  });

  it("mejor momento usa la forma reciente con signo", () => {
    const { form } = buildRankings(r, [], { minMatches: 3 });
    expect(ids(form)).toEqual(["b", "c"]);
    expect(form.entries.map((e) => e.display)).toEqual(["+0,8", "-0,3"]);
  });

  it("minMatches por debajo de 1 se trata como 1", () => {
    const rankings = buildRankings(result({ a: { matches: 1 } }), [], { minMatches: 0 });
    expect(ids(rankings.best)).toEqual(["a"]);
  });
});

describe("buildRankings · invitados", () => {
  it("los excluidos no entran a ninguna lista ni cuentan como excluidos", () => {
    const r = result({ a: { skill: 6 }, invitado: { skill: 9 } });
    const t = [totals("a", { goals: 2, mvps: 1 }), totals("invitado", { goals: 7, mvps: 3 })];
    const rankings = buildRankings(r, t, { minMatches: 1, exclude: new Set(["invitado"]) });
    expect(ids(rankings.best)).toEqual(["a"]);
    expect(ids(rankings.scorers)).toEqual(["a"]);
    expect(ids(rankings.mvps)).toEqual(["a"]);
    expect(rankings.best.excluded).toBe(0);
  });
});
