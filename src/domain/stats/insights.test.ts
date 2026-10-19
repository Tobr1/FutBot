import { describe, expect, it } from "vitest";
import { attendanceTop, goalsTrend, goalsTrendSummary, resultDistribution } from "./analytics";
import { linesInRange, sideResult, summarizeMatches } from "./match-summaries";
import { duoRanking, findRivalries, playerRelations, rateText, recordText } from "./rivalries";
import { matchLines, saturday } from "./test-fixtures";

const TZ = "America/Argentina/Buenos_Aires";

describe("summarizeMatches", () => {
  it("reconstruye equipos y marcador en orden cronológico", () => {
    const lines = [
      ...matchLines("m2", saturday(1), ["a"], ["b"], [1, 3]),
      ...matchLines("m1", saturday(0), ["a", "c"], ["b"], [2, 2]),
    ];
    const matches = summarizeMatches(lines);
    expect(matches.map((m) => m.matchId)).toEqual(["m1", "m2"]);
    expect(matches[0].teams).toEqual({ a: ["a", "c"], b: ["b"] });
    expect(matches[1].score).toEqual({ a: 1, b: 3 });
    expect(sideResult(matches[1], "b")).toBe("win");
    expect(sideResult(matches[0], "a")).toBe("draw");
  });

  it("recorta por temporada con la fecha local", () => {
    const lines = matchLines("m", "2026-01-01T01:00:00Z", ["a"], ["b"], [1, 0]);
    expect(linesInRange(lines, { from: "2025-01-01", to: "2025-12-31" }, TZ)).toHaveLength(2);
    expect(linesInRange(lines, { from: "2026-01-01", to: null }, TZ)).toHaveLength(0);
  });
});

describe("rivalidades", () => {
  // Brito y Manu juntos: 3 PG. Brito contra Tano: 3 PG. Brito contra Chino: 3 PP.
  const lines = [
    ...matchLines("m1", saturday(0), ["brito", "manu"], ["tano", "chino"], [3, 1]),
    ...matchLines("m2", saturday(1), ["brito", "manu"], ["tano", "chino"], [2, 0]),
    ...matchLines("m3", saturday(2), ["brito", "manu"], ["tano", "chino"], [1, 0]),
    ...matchLines("m4", saturday(3), ["brito", "tano"], ["chino", "manu"], [0, 2]),
    ...matchLines("m5", saturday(4), ["brito", "tano"], ["chino", "manu"], [1, 1]),
    ...matchLines("m6", saturday(5), ["brito"], ["chino"], [0, 1]),
    ...matchLines("m7", saturday(6), ["brito"], ["chino"], [0, 1]),
  ];

  it("cuenta el récord con compañeros y rivales", () => {
    const { teammates, opponents } = playerRelations(lines, "brito");
    expect(teammates.find((t) => t.playerId === "manu")).toMatchObject({ matches: 3, wins: 3, rate: 1 });
    expect(teammates.find((t) => t.playerId === "tano")).toMatchObject({ matches: 2, wins: 0, draws: 1, losses: 1 });
    expect(opponents.find((o) => o.playerId === "chino")).toMatchObject({ matches: 7, wins: 3, draws: 1, losses: 3 });
  });

  it("socio ideal, rival favorito y némesis con mínimo de 3 partidos", () => {
    const r = findRivalries(lines, "brito");
    expect(r.partner?.playerId).toBe("manu");
    expect(r.favoriteVictim?.playerId).toBe("tano");
    expect(r.favoriteVictim).toMatchObject({ wins: 3, losses: 0 });
    // Contra Chino está parejo (3-3): no es némesis. Contra Manu: 0 PG 1 PE 1 PP en 2 partidos (no llega).
    expect(r.nemesis).toBeNull();
    expect(findRivalries(lines, "brito", 2).nemesis?.playerId).toBe("manu");
  });

  it("sin datos no inventa relaciones", () => {
    expect(findRivalries([], "x")).toEqual({ partner: null, favoriteVictim: null, nemesis: null });
  });

  it("ranking de duplas por efectividad juntos", () => {
    const duos = duoRanking(lines, { minMatches: 3 });
    expect(duos[0]).toMatchObject({ players: ["brito", "manu"], matches: 3, wins: 3, rate: 1 });
    expect(duos.every((d) => d.matches >= 3)).toBe(true);
    expect(duos.find((d) => d.players.join() === "chino,tano")).toMatchObject({ matches: 3, losses: 3, rate: 0 });
    expect(duoRanking(lines, { minMatches: 3, limit: 1 })).toHaveLength(1);
  });

  it("textos", () => {
    expect(recordText({ matches: 5, wins: 3, draws: 1, losses: 1 })).toBe("3 PG · 1 PE · 1 PP");
    expect(rateText(0.666)).toBe("67%");
  });
});

describe("análisis del grupo", () => {
  const lines = [
    ...matchLines("m1", saturday(0), ["a", "b"], ["c"], [3, 1]),
    ...matchLines("m2", saturday(1), ["a"], ["c", "b"], [2, 2]),
    ...matchLines("m3", saturday(2), ["a"], ["c"], [0, 1]),
  ];

  it("reparto de resultados, goles y diferencia media", () => {
    expect(resultDistribution(lines)).toEqual({
      matches: 3,
      aWins: 1,
      bWins: 1,
      draws: 1,
      totalGoals: 9,
      goalsPerMatch: 3,
      averageMargin: 1,
      oneGoalGames: 1,
    });
    expect(resultDistribution([])).toMatchObject({ matches: 0, goalsPerMatch: null, averageMargin: null });
  });

  it("goles por partido con media móvil", () => {
    const trend = goalsTrend(lines, TZ, { window: 2 });
    expect(trend.map((p) => [p.label, p.goals, p.average])).toEqual([
      ["03/10", 4, 4],
      ["10/10", 4, 4],
      ["17/10", 1, 2.5],
    ]);
    expect(goalsTrend(lines, TZ, { limit: 1 })).toHaveLength(1);
    expect(goalsTrendSummary(trend)).toContain("3 partidos");
    expect(goalsTrendSummary([])).toBe("Todavía no hay partidos jugados.");
  });

  it("asistencia: los que más jugaron", () => {
    const top = attendanceTop(lines);
    expect(top.map((t) => [t.playerId, t.matches])).toEqual([
      ["a", 3],
      ["c", 3],
      ["b", 2],
    ]);
    expect(top[2].share).toBeCloseTo(2 / 3);
  });
});
