import { describe, expect, it } from "vitest";
import { buildRatingInput } from "@/domain/stats/engine-input";
import { summarizeMatches } from "@/domain/stats/match-summaries";
import { matchLines, saturday } from "@/domain/stats/test-fixtures";
import { computeRatings, type PlayerProfile, type RatingResult, winProbability } from "@/domain/rating";
import { percentText, predictionAccuracy, predictMatch, preMatchSkills } from "./accuracy";

const TZ = "America/Argentina/Buenos_Aires";

const PLAYERS: PlayerProfile[] = [
  { id: "crack", baseRating: 8, primaryPosition: "forward" },
  { id: "bueno", baseRating: 6, primaryPosition: "midfielder" },
  { id: "flojo", baseRating: 4, primaryPosition: "defender" },
  { id: "sin-nivel", baseRating: null, primaryPosition: null },
];

describe("preMatchSkills", () => {
  it("usa la habilidad previa del historial del motor y el nivel inicial en el debut", () => {
    const result = {
      byPlayer: {
        crack: { history: [{ matchId: "m1", skill: 8.2 }, { matchId: "m2", skill: 8.4 }] },
      },
    } as unknown as RatingResult;
    const before = preMatchSkills(result, PLAYERS);
    expect(before("m1", "crack")).toBe(8);
    expect(before("m2", "crack")).toBe(8.2);
    expect(before("m1", "bueno")).toBe(6);
    // Sin nivel inicial: la media del grupo (8 + 6 + 4) / 3.
    expect(before("m1", "sin-nivel")).toBe(6);
  });

  it("coincide con el motor: el punto anterior es la habilidad con la que jugó", () => {
    const lines = [
      ...matchLines("m1", saturday(0), ["crack", "flojo"], ["bueno", "sin-nivel"], [3, 1], { crack: { g: 2 } }),
      ...matchLines("m2", saturday(1), ["crack", "bueno"], ["flojo", "sin-nivel"], [1, 1]),
    ];
    const result = computeRatings(buildRatingInput({ players: PLAYERS, lines, aggregates: [] }, { range: { from: null, to: null }, timeZone: TZ }));
    const before = preMatchSkills(result, PLAYERS);
    expect(before("m2", "crack")).toBe(result.byPlayer.crack.history[0].skill);
  });
});

describe("predictMatch", () => {
  const skill = (_m: string, id: string) => ({ a1: 8, a2: 7, b1: 5, b2: 5 })[id] ?? 5;

  it("marca favorito y acierto", () => {
    const [match] = summarizeMatches(matchLines("m", saturday(0), ["a1", "a2"], ["b1", "b2"], [2, 1]));
    const p = predictMatch(match, skill);
    expect(p.probability).toEqual(winProbability([8, 7], [5, 5]));
    expect(p.favorite).toBe("a");
    expect(p.hit).toBe(true);
    expect(p.outcome).toBe("a");
  });

  it("un empate es error del favorito; parejo exacto no tiene favorito", () => {
    const [draw] = summarizeMatches(matchLines("m", saturday(0), ["a1"], ["b1"], [1, 1]));
    expect(predictMatch(draw, skill)).toMatchObject({ outcome: "draw", hit: false });
    const [even] = summarizeMatches(matchLines("m", saturday(0), ["b1"], ["b2"], [1, 0]));
    expect(predictMatch(even, skill)).toMatchObject({ favorite: null, hit: null });
  });
});

describe("predictionAccuracy", () => {
  const skill = (_m: string, id: string) => ({ fuerte: 8, debil: 4, medio: 6 })[id] ?? 5;
  const lines = [
    ...matchLines("m1", saturday(0), ["fuerte"], ["debil"], [3, 0]), // acierto
    ...matchLines("m2", saturday(1), ["fuerte"], ["debil"], [0, 1]), // error
    ...matchLines("m3", saturday(2), ["debil"], ["fuerte"], [0, 2]), // acierto
    ...matchLines("m4", saturday(3), ["medio"], ["fuerte"], [1, 1]), // empate: error
    ...matchLines("m5", saturday(4), ["x"], ["y"], [1, 0]), // parejo: sin favorito
  ];
  const acc = predictionAccuracy(lines, skill);

  it("cuenta aciertos solo en partidos con favorito", () => {
    expect(acc.predictions).toHaveLength(5);
    expect(acc.decided).toBe(4);
    expect(acc.hits).toBe(2);
    expect(acc.draws).toBe(1);
    expect(acc.hitRate).toBe(0.5);
    expect(percentText(acc.hitRate)).toBe("50%");
    expect(percentText(null)).toBe("—");
  });

  it("Brier entre 0 y 2 y calibración por rangos", () => {
    expect(acc.brier).toBeGreaterThan(0);
    expect(acc.brier).toBeLessThan(2);
    expect(acc.calibration.map((b) => b.key)).toEqual(["parejo", "leve", "claro"]);
    const total = acc.calibration.reduce((s, b) => s + b.matches, 0);
    expect(total).toBe(4);
    const claro = acc.calibration.find((b) => b.key === "claro")!;
    expect(claro.observed).not.toBeNull();
    expect(claro.expected).toBeGreaterThanOrEqual(0.55);
  });

  it("sin partidos", () => {
    const empty = predictionAccuracy([], skill);
    expect(empty).toMatchObject({ decided: 0, hitRate: null, brier: null });
    expect(empty.calibration.every((b) => b.observed === null)).toBe(true);
  });
});
