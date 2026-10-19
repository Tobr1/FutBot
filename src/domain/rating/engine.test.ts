import { describe, expect, it } from "vitest";
import { ratingTier } from "@/domain/players/rating";
import { DEFAULT_RATING_CONFIG, ENGINE_VERSION, resolveRatingConfig } from "./config";
import { computeRatings, confidenceFor, eloExpected, shrinkPerformance, sigmaFor, voteAlpha } from "./engine";
import type { MatchHistory, PlayerLine, PlayerProfile, RatingAggregate, RatingInput, RatingPosition } from "./types";

const BASE_DATE = Date.UTC(2026, 0, 1, 20);

function playedAt(day: number): string {
  return new Date(BASE_DATE + day * 86_400_000).toISOString();
}

function player(id: string, baseRating: number | null = 5, primaryPosition: RatingPosition | null = "midfielder"): PlayerProfile {
  return { id, baseRating, primaryPosition };
}

function match(matchId: string, day: number, a: string[], b: string[], scoreA: number, scoreB: number): MatchHistory {
  return { matchId, playedAt: playedAt(day), teams: { a, b }, score: { a: scoreA, b: scoreB } };
}

function line(matchId: string, playerId: string, side: "a" | "b", goals = 0, assists = 0): PlayerLine {
  return { matchId, playerId, side, goals, assists, ownGoals: 0, isMvp: false };
}

function agg(matchId: string, playerId: string, adjustedAverage: number | null, votes = 6): RatingAggregate {
  return { matchId, playerId, votes, adjustedAverage };
}

function input(partial: Partial<RatingInput>): RatingInput {
  return { players: [], matches: [], lines: [], aggregates: [], ...partial };
}

/** Pesos solo de votos, para aislar S_v. */
const VOTES_ONLY = { weights: { votes: 1, results: 0, offense: 0 } };

describe("config", () => {
  it("expone la versión y los parámetros del §6", () => {
    expect(ENGINE_VERSION).toBe("v1");
    expect(DEFAULT_RATING_CONFIG.performance.shrinkageK).toBe(2);
    expect(DEFAULT_RATING_CONFIG.votes).toEqual({ n0: 3, alphaMin: 0.12 });
    expect(DEFAULT_RATING_CONFIG.weights).toEqual({ votes: 0.65, results: 0.25, offense: 0.1 });
    expect(DEFAULT_RATING_CONFIG.results.eloScale).toBe(2);
    expect(DEFAULT_RATING_CONFIG.confidence).toEqual({ tau: 4, provisionalMatches: 3 });
    expect(DEFAULT_RATING_CONFIG.form.window).toBe(5);
    expect(DEFAULT_RATING_CONFIG.consistency.minMatches).toBe(5);
    expect(DEFAULT_RATING_CONFIG.offense.assistWeight).toBe(0.7);
    const { baselines } = DEFAULT_RATING_CONFIG.offense;
    expect(baselines.goalkeeper).toBeLessThan(baselines.defender);
    expect(baselines.defender).toBeLessThan(baselines.midfielder);
    expect(baselines.midfielder).toBeLessThan(baselines.forward);
  });

  it("aplica cambios parciales con merge profundo sin mutar los valores por defecto", () => {
    const config = resolveRatingConfig({ weights: { votes: 1 }, offense: { baselines: { forward: 2 } } });
    expect(config.weights).toEqual({ votes: 1, results: 0.25, offense: 0.1 });
    expect(config.offense.baselines.forward).toBe(2);
    expect(config.offense.baselines.defender).toBe(0.4);
    expect(DEFAULT_RATING_CONFIG.weights.votes).toBe(0.65);
    expect(DEFAULT_RATING_CONFIG.offense.baselines.forward).toBe(1.2);
    expect(resolveRatingConfig()).toBe(DEFAULT_RATING_CONFIG);
  });
});

describe("helpers", () => {
  it("α arranca en 1/4 y baja hasta α_min", () => {
    expect(voteAlpha(1)).toBe(0.25);
    expect(voteAlpha(2)).toBe(0.2);
    expect(voteAlpha(6)).toBe(0.12);
    expect(voteAlpha(100)).toBe(0.12);
  });

  it("la confianza sigue c = 1 − e^(−n/4) y σ baja con ella", () => {
    expect(confidenceFor(0)).toBe(0);
    expect(confidenceFor(4)).toBeCloseTo(1 - Math.exp(-1), 12);
    expect(sigmaFor(0)).toBe(DEFAULT_RATING_CONFIG.uncertainty.sigma0);
    expect(sigmaFor(1)).toBe(DEFAULT_RATING_CONFIG.uncertainty.sigmaMin);
    expect(sigmaFor(confidenceFor(10))).toBeLessThan(sigmaFor(confidenceFor(2)));
  });

  it("el esperado Elo es 0,5 a la par y simétrico", () => {
    expect(eloExpected(6, 6, 2)).toBe(0.5);
    expect(eloExpected(7, 5, 2)).toBeCloseTo(1 / 1.1, 12);
    expect(eloExpected(7, 5, 2) + eloExpected(5, 7, 2)).toBeCloseTo(1, 12);
  });

  it("contrae P hacia la media del partido según la cantidad de votos", () => {
    expect(shrinkPerformance(9, 2, 7, 2)).toBe(8);
    expect(shrinkPerformance(9, 0, 7, 2)).toBe(7);
    expect(shrinkPerformance(9, 1000, 7, 2)).toBeCloseTo(9, 2);
  });
});

describe("computeRatings · arranque", () => {
  it("sin partidos, el jugador queda en su nivel inicial con incertidumbre máxima", () => {
    const result = computeRatings(input({ players: [player("p1", 7.5)] }));
    const r = result.byPlayer.p1;
    expect(result.engineVersion).toBe("v1");
    expect(r.skill).toBe(7.5);
    expect(r.matches).toBe(0);
    expect(r.confidence).toBe(0);
    expect(r.sigma).toBe(DEFAULT_RATING_CONFIG.uncertainty.sigma0);
    expect(r.conservative).toBe(7.5 - DEFAULT_RATING_CONFIG.uncertainty.sigma0);
    expect(r.isProvisional).toBe(true);
    expect(r.performanceAvg).toBeNull();
    expect(r.consistency).toBeNull();
    expect(r.recentForm).toBeNull();
    expect(r.history).toEqual([]);
  });

  it("sin nivel inicial usa la media del grupo (también para desconocidos que jugaron)", () => {
    const result = computeRatings(
      input({
        players: [player("a", 4), player("b", 8), player("c", null)],
        matches: [match("m1", 0, ["c", "x"], ["a", "b"], 1, 1)],
        aggregates: [],
      }),
      VOTES_ONLY,
    );
    expect(result.byPlayer.c.skill).toBe(6);
    expect(result.byPlayer.x.skill).toBe(6);
    expect(result.byPlayer.x.matches).toBe(1);
  });

  it("sin ningún nivel inicial usa defaultRating", () => {
    const result = computeRatings(input({ players: [player("a", null)] }));
    expect(result.byPlayer.a.skill).toBe(DEFAULT_RATING_CONFIG.defaultRating);
  });

  it("acota la valoración inicial a 1-10", () => {
    const result = computeRatings(input({ players: [player("a", 14), player("b", -3)] }));
    expect(result.byPlayer.a.skill).toBe(10);
    expect(result.byPlayer.b.skill).toBe(1);
  });
});

describe("computeRatings · rendimiento P", () => {
  it("contrae cada promedio hacia la media del partido y omite a los que no tienen votos", () => {
    const result = computeRatings(
      input({
        players: [player("a"), player("b"), player("c"), player("d")],
        matches: [match("m1", 0, ["a", "b"], ["c", "d"], 2, 1)],
        aggregates: [agg("m1", "a", 9, 2), agg("m1", "b", 5, 2), agg("m1", "c", null, 0), agg("m1", "d", 7, 0)],
      }),
    );
    // μ = 7 (solo a y b tienen votos válidos).
    expect(result.byMatch.m1.performances).toEqual({ a: 8, b: 6 });
    expect(result.byPlayer.c.matchesWithVotes).toBe(0);
    expect(result.byPlayer.c.history[0].performance).toBeNull();
    expect(result.byPlayer.a.history[0].performance).toBe(8);
  });

  it("ignora votos de jugadores que no estuvieron en el partido o de partidos inexistentes", () => {
    const result = computeRatings(
      input({
        players: [player("a"), player("b")],
        matches: [match("m1", 0, ["a"], ["b"], 0, 0)],
        aggregates: [agg("m1", "a", 8), agg("m1", "zz", 2), agg("m9", "a", 1)],
      }),
    );
    expect(result.byMatch.m1.performances).toEqual({ a: 8 });
    expect(result.byMatch.m9).toBeUndefined();
  });
});

describe("computeRatings · robustez", () => {
  it("un solo partido mueve S_v solo ¼ del camino hacia P", () => {
    const result = computeRatings(
      input({
        players: [player("a"), player("b"), player("c"), player("d")],
        matches: [match("m1", 0, ["a", "b"], ["c", "d"], 1, 1)],
        aggregates: [agg("m1", "a", 10, 8), agg("m1", "b", 6, 8), agg("m1", "c", 6, 8), agg("m1", "d", 6, 8)],
      }),
      VOTES_ONLY,
    );
    const p = result.byMatch.m1.performances.a;
    expect(p).toBeGreaterThan(9);
    expect(result.byPlayer.a.skill).toBeCloseTo(5 + (p - 5) / 4, 12);
  });

  it("un partido brillante no convierte a nadie en figura con los pesos por defecto", () => {
    const result = computeRatings(
      input({
        players: [player("a"), player("b"), player("c"), player("d")],
        matches: [match("m1", 0, ["a", "b"], ["c", "d"], 1, 1)],
        aggregates: [agg("m1", "a", 10, 8), agg("m1", "b", 6, 8), agg("m1", "c", 6, 8), agg("m1", "d", 6, 8)],
      }),
    );
    const p = result.byMatch.m1.performances.a;
    const moved = result.byPlayer.a.skill - 5;
    expect(moved).toBeGreaterThan(0);
    expect(moved).toBeLessThanOrEqual((p - 5) / 4);
    expect(ratingTier(result.byPlayer.a.skill)).toBe("titular");
  });

  it("una mala tarde después de muchas buenas apenas mueve la valoración (≈ α_min)", () => {
    const ids = ["a", "b", "c", "d"];
    const matches: MatchHistory[] = [];
    const aggregates: RatingAggregate[] = [];
    for (let i = 0; i < 12; i++) {
      const id = `m${String(i).padStart(2, "0")}`;
      matches.push(match(id, i, ["a", "b"], ["c", "d"], 1, 1));
      const aScore = i === 11 ? 2 : 8.5;
      aggregates.push(agg(id, "a", aScore), agg(id, "b", 6), agg(id, "c", 6), agg(id, "d", 6));
    }
    const players = ids.map((id) => player(id));

    const votesOnly = computeRatings(input({ players, matches, aggregates }), VOTES_ONLY);
    const hist = votesOnly.byPlayer.a.history;
    const before = hist[10].skill;
    const after = hist[11].skill;
    const pBad = votesOnly.byMatch.m11.performances.a;
    expect(before).toBeGreaterThan(7);
    expect(after - before).toBeCloseTo(0.12 * (pBad - before), 12);

    const full = computeRatings(input({ players, matches, aggregates }));
    const fullHist = full.byPlayer.a.history;
    const drop = fullHist[10].skill - fullHist[11].skill;
    expect(drop).toBeGreaterThan(0);
    expect(drop).toBeLessThan(0.12 * (fullHist[10].skill - pBad));
  });

  it("los defensores que ganan sin hacer goles suben (más que un delantero con la misma planilla)", () => {
    const players = [
      player("def", 5, "defender"),
      player("fwd", 5, "forward"),
      player("o1", 5, "midfielder"),
      player("o2", 5, "midfielder"),
    ];
    const matches = Array.from({ length: 10 }, (_, i) => match(`m${i}`, i, ["def", "fwd"], ["o1", "o2"], 2, 1));
    const result = computeRatings(input({ players, matches }));
    expect(result.byPlayer.def.skill).toBeGreaterThan(5);
    expect(result.byPlayer.def.skill).toBeGreaterThan(result.byPlayer.fwd.skill);
    expect(result.byPlayer.o1.skill).toBeLessThan(5);

    const losing = computeRatings(
      input({ players, matches: matches.map((m) => ({ ...m, score: { a: 1, b: 2 } })) }),
    );
    expect(losing.byPlayer.def.skill).toBeLessThan(result.byPlayer.def.skill);
  });

  it("ganarle a un equipo más fuerte suma más que ganarle a uno más débil", () => {
    const players = [player("weak", 4), player("strong", 7), player("mid1", 5.5), player("mid2", 5.5)];
    const upset = computeRatings(input({ players, matches: [match("m1", 0, ["weak"], ["strong"], 1, 0)] }));
    const expected = computeRatings(input({ players, matches: [match("m1", 0, ["strong"], ["weak"], 1, 0)] }));
    const gainUpset = upset.byPlayer.weak.skill - 4;
    const gainExpected = expected.byPlayer.strong.skill - 7;
    expect(gainUpset).toBeGreaterThan(gainExpected);
  });

  it("una goleada mueve más que un triunfo ajustado", () => {
    const players = [player("a"), player("b")];
    const tight = computeRatings(input({ players, matches: [match("m1", 0, ["a"], ["b"], 1, 0)] }));
    const rout = computeRatings(input({ players, matches: [match("m1", 0, ["a"], ["b"], 6, 0)] }));
    expect(rout.byPlayer.a.skill).toBeGreaterThan(tight.byPlayer.a.skill);
    expect(tight.byPlayer.a.skill).toBeGreaterThan(5);
  });

  it("el aporte ofensivo es relativo a la posición", () => {
    const players = [player("def", 5, "defender"), player("fwd", 5, "forward"), player("x"), player("y")];
    const matches = Array.from({ length: 6 }, (_, i) => match(`m${i}`, i, ["def", "fwd"], ["x", "y"], 1, 1));
    const lines = matches.flatMap((m) => [line(m.matchId, "def", "a", 1), line(m.matchId, "fwd", "a", 1)]);
    const result = computeRatings(input({ players, matches, lines }));
    expect(result.byPlayer.def.skill).toBeGreaterThan(5);
    expect(result.byPlayer.def.skill).toBeGreaterThan(result.byPlayer.fwd.skill);
  });

  it("acota la habilidad a 1-10", () => {
    const players = [player("top", 9.9), player("bottom", 1.1)];
    const matches = Array.from({ length: 30 }, (_, i) => match(`m${i}`, i, ["top"], ["bottom"], 10, 0));
    const aggregates = matches.flatMap((m) => [agg(m.matchId, "top", 10, 20), agg(m.matchId, "bottom", 1, 20)]);
    const lines = matches.map((m) => line(m.matchId, "top", "a", 10, 5));
    const result = computeRatings(input({ players, matches, aggregates, lines }));
    for (const r of Object.values(result.byPlayer)) {
      for (const h of r.history) {
        expect(h.skill).toBeGreaterThanOrEqual(1);
        expect(h.skill).toBeLessThanOrEqual(10);
      }
    }
  });
});

describe("computeRatings · renormalización de pesos", () => {
  it("sin votos, S combina solo resultados y aporte ofensivo con pesos renormalizados", () => {
    const result = computeRatings(
      input({
        players: [player("a"), player("b")],
        matches: [match("m1", 0, ["a"], ["b"], 1, 0)],
      }),
    );
    const { k, goalDiffFactor } = DEFAULT_RATING_CONFIG.results;
    const sr = 5 + k * 0.5 * (1 + goalDiffFactor * Math.log(2));
    const so = 5 + (1.5 * -0.8) / (1 + 5);
    expect(result.byPlayer.a.skill).toBeCloseTo((0.25 * sr + 0.1 * so) / 0.35, 12);
    expect(result.byPlayer.a.matchesWithVotes).toBe(0);
  });

  it("un partido sin votos no toca S_v pero sigue pesando en S", () => {
    const players = [player("a"), player("b")];
    const withVotes = match("m1", 0, ["a"], ["b"], 0, 0);
    const noVotes = match("m2", 1, ["a"], ["b"], 0, 0);
    const result = computeRatings(
      input({ players, matches: [withVotes, noVotes], aggregates: [agg("m1", "a", 9), agg("m1", "b", 5)] }),
      { weights: { votes: 1, results: 1, offense: 0 } },
    );
    const pa = result.byMatch.m1.performances.a;
    const pb = result.byMatch.m1.performances.b;
    expect(result.byMatch.m2.performances).toEqual({});
    // m1: empate a la par, S_r no cambia; S_v se mueve ¼ hacia P.
    const sva = 5 + (pa - 5) / 4;
    const svb = 5 + (pb - 5) / 4;
    const [h1, h2] = result.byPlayer.a.history;
    expect(h1.skill).toBeCloseTo((sva + 5) / 2, 12);
    // m2 sin votos: S_v queda igual y solo se mueve S_r (a llegaba como favorito y empató).
    const expectedA = eloExpected((sva + 5) / 2, (svb + 5) / 2, 2);
    const sr = 5 + DEFAULT_RATING_CONFIG.results.k * (0.5 - expectedA);
    expect(h2.skill).toBeCloseTo((sva + sr) / 2, 12);
    expect(h2.skill).toBeLessThan(h1.skill);
    expect(result.byPlayer.a.matchesWithVotes).toBe(1);
  });

  it("con todos los pesos presentes en cero el jugador queda en su prior", () => {
    const result = computeRatings(
      input({ players: [player("a", 6), player("b")], matches: [match("m1", 0, ["a"], ["b"], 3, 0)] }),
      VOTES_ONLY,
    );
    expect(result.byPlayer.a.skill).toBe(6);
    expect(result.byPlayer.a.matches).toBe(1);
  });

  it("un partido sin marcador válido omite el componente de resultados", () => {
    const result = computeRatings(
      input({
        players: [player("a"), player("b")],
        matches: [{ ...match("m1", 0, ["a"], ["b"], 0, 0), score: { a: Number.NaN, b: 1 } }],
      }),
      { weights: { votes: 0, results: 1, offense: 0 } },
    );
    expect(result.byPlayer.a.skill).toBe(5);
  });
});

describe("computeRatings · confianza y provisional", () => {
  const players = [player("a"), player("b"), player("c")];
  const matches = Array.from({ length: 6 }, (_, i) => match(`m${i}`, i, ["a"], ["b"], 1, 1));

  it("marca provisional hasta 3 partidos y la confianza crece con c = 1 − e^(−n/4)", () => {
    for (let n = 0; n <= 6; n++) {
      const r = computeRatings(input({ players, matches: matches.slice(0, n) })).byPlayer.a;
      expect(r.matches).toBe(n);
      expect(r.isProvisional).toBe(n < 3);
      expect(r.confidence).toBeCloseTo(1 - Math.exp(-n / 4), 12);
      expect(r.sigma).toBeCloseTo(sigmaFor(r.confidence), 12);
      expect(r.conservative).toBeCloseTo(r.skill - r.sigma, 12);
    }
  });

  it("un jugador que no juega queda igual", () => {
    const result = computeRatings(
      input({ players, matches: [match("m1", 0, ["a"], ["b"], 3, 0), match("m2", 1, ["a"], ["c"], 0, 2)] }),
    );
    expect(result.byPlayer.b.history.map((h) => h.matchId)).toEqual(["m1"]);
    expect(result.byPlayer.b.skill).toBe(result.byPlayer.b.history[0].skill);
    expect(result.byPlayer.a.matches).toBe(2);
    expect(result.byPlayer.c.matches).toBe(1);
  });
});

describe("computeRatings · determinismo", () => {
  function scenario(): RatingInput {
    const ids = ["p1", "p2", "p3", "p4", "p5", "p6"];
    const positions: RatingPosition[] = ["goalkeeper", "defender", "midfielder", "forward", "defender", "forward"];
    const players = ids.map((id, i) => player(id, 4 + i * 0.7, positions[i]));
    const matches: MatchHistory[] = [];
    const lines: PlayerLine[] = [];
    const aggregates: RatingAggregate[] = [];
    for (let i = 0; i < 9; i++) {
      const rot = ids.map((_, j) => ids[(i + j) % ids.length]);
      const a = rot.slice(0, 3);
      const b = rot.slice(3);
      const id = `m${i}`;
      matches.push(match(id, i, a, b, (i * 3) % 5, (i * 2) % 4));
      a.forEach((p, j) => lines.push(line(id, p, "a", (i + j) % 3, j % 2)));
      b.forEach((p, j) => lines.push(line(id, p, "b", (i + j + 1) % 2, (j + 1) % 2)));
      if (i % 3 !== 2) {
        rot.forEach((p, j) => aggregates.push(agg(id, p, 4 + ((i * 7 + j * 3) % 6), 3 + (j % 3))));
      }
    }
    // Dos partidos el mismo día: desempata por id.
    matches.push({ ...match("m9b", 9, ["p1", "p2", "p3"], ["p4", "p5", "p6"], 2, 2) });
    matches.push({ ...match("m9a", 9, ["p4", "p2", "p6"], ["p1", "p5", "p3"], 0, 3) });
    return { players, matches, lines, aggregates };
  }

  function shuffle<T>(arr: readonly T[], seed: number): T[] {
    const out = [...arr];
    let s = seed;
    for (let i = out.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) % 2147483648;
      const j = s % (i + 1);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  it("la misma entrada da exactamente el mismo resultado", () => {
    expect(computeRatings(scenario())).toEqual(computeRatings(scenario()));
  });

  it("el orden de las entradas no cambia el resultado", () => {
    const base = scenario();
    const reference = computeRatings(base);
    for (const seed of [1, 7, 42]) {
      const shuffled: RatingInput = {
        players: shuffle(base.players, seed),
        matches: shuffle(base.matches, seed + 1).map((m) => ({
          ...m,
          teams: { a: shuffle(m.teams.a, seed + 2), b: shuffle(m.teams.b, seed + 3) },
        })),
        lines: shuffle(base.lines, seed + 4),
        aggregates: shuffle(base.aggregates, seed + 5),
      };
      expect(computeRatings(shuffled)).toEqual(reference);
    }
  });

  it("repite el historial en orden cronológico y luego por id", () => {
    const result = computeRatings(scenario());
    expect(result.byPlayer.p1.history.map((h) => h.matchId).slice(-2)).toEqual(["m9a", "m9b"]);
    const dates = result.byPlayer.p1.history.map((h) => Date.parse(h.playedAt));
    expect([...dates].sort((x, y) => x - y)).toEqual(dates);
  });

  it("ordena bien fechas ISO con distinto huso horario", () => {
    const players = [player("a"), player("b")];
    const result = computeRatings(
      input({
        players,
        matches: [
          { matchId: "late", playedAt: "2026-03-01T22:00:00-03:00", teams: { a: ["a"], b: ["b"] }, score: { a: 1, b: 0 } },
          { matchId: "early", playedAt: "2026-03-02T00:30:00Z", teams: { a: ["a"], b: ["b"] }, score: { a: 0, b: 1 } },
        ],
      }),
    );
    expect(result.byPlayer.a.history.map((h) => h.matchId)).toEqual(["early", "late"]);
  });
});

describe("computeRatings · regularidad y forma", () => {
  function run(perfs: Array<number | null>) {
    const players = [player("a"), player("b"), player("c")];
    const matches = perfs.map((_, i) => match(`m${i}`, i, ["a"], ["b", "c"], 1, 1));
    const aggregates = perfs.flatMap((p, i) =>
      p === null ? [] : [agg(`m${i}`, "a", p, 1000), agg(`m${i}`, "b", 6, 1000), agg(`m${i}`, "c", 6, 1000)],
    );
    return computeRatings(input({ players, matches, aggregates }));
  }

  it("la regularidad necesita 5 partidos con votos", () => {
    expect(run([7, 7, 7, 7]).byPlayer.a.consistency).toBeNull();
    expect(run([7, 7, null, 7, 7]).byPlayer.a.consistency).toBeNull();
    expect(run([7, 7, 7, 7, 7]).byPlayer.a.consistency).toBeCloseTo(100, 1);
  });

  it("más desvío de P es menos regularidad (0-100)", () => {
    const steady = run([7, 7.5, 7, 7.5, 7]).byPlayer.a.consistency!;
    const erratic = run([3, 9, 3, 9, 3]).byPlayer.a.consistency!;
    const wild = run([1, 10, 1, 10, 1, 10]).byPlayer.a.consistency!;
    expect(steady).toBeGreaterThan(erratic);
    expect(erratic).toBeGreaterThanOrEqual(0);
    expect(steady).toBeLessThanOrEqual(100);
    expect(wild).toBe(0);
  });

  it("la forma es la media de P de los últimos 5 menos S y necesita 3 de esos 5 con votos", () => {
    expect(run([8, 8, null, null, null, 8]).byPlayer.a.recentForm).toBeNull();
    const result = run([5, 5, 5, 9, 9, null, 9]);
    const r = result.byPlayer.a;
    const lastPerfs = r.history.slice(-5).map((h) => h.performance).filter((p): p is number => p !== null);
    expect(lastPerfs).toHaveLength(4);
    const expected = lastPerfs.reduce((s, p) => s + p, 0) / lastPerfs.length - r.skill;
    expect(r.recentForm).toBeCloseTo(expected, 12);
    expect(r.recentForm!).toBeGreaterThan(0);
    expect(run([9, 9, 9, 9, 2, 2, 2, 2, 2]).byPlayer.a.recentForm!).toBeLessThan(0);
  });

  it("performanceAvg es la media de P", () => {
    const r = run([6, null, 8]).byPlayer.a;
    expect(r.performanceAvg).toBeCloseTo(7, 2);
    expect(r.matchesWithVotes).toBe(2);
    expect(r.matches).toBe(3);
  });
});
