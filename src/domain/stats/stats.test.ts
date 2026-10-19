import { describe, expect, it } from "vitest";
import { computeRatings, type PlayerHistoryPoint } from "@/domain/rating";
import { buildRatingInput, type MatchLineRow } from "./engine-input";
import { evolutionDomain, evolutionSeries, evolutionSummary } from "./evolution";
import { compareRows, EMPTY_HEAD_TO_HEAD, headToHeadText } from "./head-to-head";
import { averageRating, groupByMonth, monthLabel, parsePage, scorersText, tallyScorers } from "./history";
import { contributionText, displayRating, recentLines, resultOf } from "./player-lines";
import { emptyRankingText, excludedLabel, parseMinMatches, RANKING_TABS, rankingTabBySlug } from "./rankings-view";
import {
  ALL_SEASONS,
  currentSeason,
  inDateRange,
  instantInRange,
  rangeToInstants,
  resolveSeason,
  type SeasonLike,
  seasonRange,
} from "./seasons";

const TZ = "America/Argentina/Buenos_Aires";

const SEASONS: SeasonLike[] = [
  { id: "s2025", name: "2025", starts_on: "2025-01-01", ends_on: "2025-12-31" },
  { id: "s2026", name: "2026", starts_on: "2026-01-01", ends_on: null },
];

describe("temporadas", () => {
  it("convierte una temporada en rango y filtra fechas incluidas", () => {
    expect(seasonRange(SEASONS[0])).toEqual({ from: "2025-01-01", to: "2025-12-31" });
    expect(seasonRange(null)).toEqual({ from: null, to: null });
    expect(inDateRange("2025-12-31", seasonRange(SEASONS[0]))).toBe(true);
    expect(inDateRange("2026-01-01", seasonRange(SEASONS[0]))).toBe(false);
    expect(inDateRange("2030-05-05", seasonRange(SEASONS[1]))).toBe(true);
  });

  it("usa la fecha local del grupo, no la UTC", () => {
    // 31/12/2025 22:00 en Buenos Aires = 01:00 Z del 1/1/2026.
    const iso = "2026-01-01T01:00:00Z";
    expect(instantInRange(iso, seasonRange(SEASONS[0]), TZ)).toBe(true);
    expect(instantInRange(iso, seasonRange(SEASONS[1]), TZ)).toBe(false);
  });

  it("arma los límites UTC con el día final excluido", () => {
    expect(rangeToInstants(seasonRange(SEASONS[0]), TZ)).toEqual({
      fromIso: "2025-01-01T03:00:00.000Z",
      toIsoExclusive: "2026-01-01T03:00:00.000Z",
    });
    expect(rangeToInstants({ from: null, to: null }, TZ)).toEqual({ fromIso: null, toIsoExclusive: null });
  });

  it("elige la temporada actual", () => {
    expect(currentSeason(SEASONS, "2026-10-19")?.id).toBe("s2026");
    expect(currentSeason(SEASONS, "2025-06-01")?.id).toBe("s2025");
    // Antes de todas: la más reciente.
    expect(currentSeason(SEASONS, "2020-01-01")?.id).toBe("s2026");
    expect(currentSeason([], "2026-10-19")).toBeNull();
  });

  it("interpreta el filtro de la URL", () => {
    expect(resolveSeason(SEASONS, undefined, "2026-10-19").value).toBe("s2026");
    expect(resolveSeason(SEASONS, "s2025", "2026-10-19").range).toEqual({ from: "2025-01-01", to: "2025-12-31" });
    expect(resolveSeason(SEASONS, ALL_SEASONS, "2026-10-19")).toEqual({
      season: null,
      range: { from: null, to: null },
      value: ALL_SEASONS,
    });
    expect(resolveSeason(SEASONS, "inexistente", "2026-10-19").value).toBe("s2026");
    expect(resolveSeason([], undefined, "2026-10-19").value).toBe(ALL_SEASONS);
  });
});

const line = (partial: Partial<MatchLineRow> & Pick<MatchLineRow, "matchId" | "playerId" | "side">): MatchLineRow => ({
  scheduledAt: "2026-10-10T01:00:00Z",
  goalsFor: 0,
  goalsAgainst: 0,
  goals: 0,
  assists: 0,
  ownGoals: 0,
  isMvp: false,
  ...partial,
});

describe("buildRatingInput", () => {
  const lines: MatchLineRow[] = [
    line({ matchId: "m1", playerId: "a1", side: "a", goalsFor: 3, goalsAgainst: 1, goals: 2 }),
    line({ matchId: "m1", playerId: "b1", side: "b", goalsFor: 1, goalsAgainst: 3 }),
    line({ matchId: "m0", playerId: "a1", side: "b", scheduledAt: "2025-05-01T22:00:00Z", goalsFor: 0, goalsAgainst: 0 }),
  ];
  const source = {
    players: [
      { id: "a1", baseRating: 6, primaryPosition: "forward" as const },
      { id: "b1", baseRating: 5, primaryPosition: null },
    ],
    lines,
    aggregates: [
      { matchId: "m1", playerId: "a1", votes: 3, adjustedAverage: 8 },
      { matchId: "m0", playerId: "a1", votes: 3, adjustedAverage: 4 },
    ],
  };

  it("reconstruye partidos con equipos y marcador desde las filas", () => {
    const input = buildRatingInput(source, { range: { from: null, to: null }, timeZone: TZ });
    const m1 = input.matches.find((m) => m.matchId === "m1");
    expect(m1).toEqual({ matchId: "m1", playedAt: "2026-10-10T01:00:00Z", teams: { a: ["a1"], b: ["b1"] }, score: { a: 3, b: 1 } });
    expect(input.lines).toHaveLength(3);
    expect(input.aggregates).toHaveLength(2);
  });

  it("recorta por temporada (partidos, líneas y votos)", () => {
    const input = buildRatingInput(source, { range: seasonRange(SEASONS[1]), timeZone: TZ });
    expect(input.matches.map((m) => m.matchId)).toEqual(["m1"]);
    expect(input.lines.every((l) => l.matchId === "m1")).toBe(true);
    expect(input.aggregates.map((a) => a.matchId)).toEqual(["m1"]);
  });

  it("alimenta al motor sin errores", () => {
    const result = computeRatings(buildRatingInput(source, { range: { from: null, to: null }, timeZone: TZ }));
    expect(result.byPlayer.a1.matches).toBe(2);
    expect(result.byPlayer.b1.matches).toBe(1);
  });
});

describe("evolución", () => {
  const history: PlayerHistoryPoint[] = [
    { matchId: "m1", playedAt: "2026-10-04T01:00:00Z", skill: 6.123, performance: null },
    { matchId: "m2", playedAt: "2026-10-11T01:00:00Z", skill: 6.4, performance: 7.456 },
    { matchId: "m3", playedAt: "2026-10-18T01:00:00Z", skill: 6.81, performance: 8 },
  ];

  it("arma la serie con fecha local y redondeo", () => {
    const series = evolutionSeries(history, TZ);
    expect(series[0]).toEqual({ matchId: "m1", date: "2026-10-03", label: "03/10", skill: 6.12, performance: null });
    expect(series[1].performance).toBe(7.46);
    expect(evolutionSeries(history, TZ, 2).map((p) => p.matchId)).toEqual(["m2", "m3"]);
  });

  it("ajusta el eje Y con aire y un alto mínimo", () => {
    expect(evolutionDomain(evolutionSeries(history, TZ))).toEqual([5, 9]);
    expect(evolutionDomain([])).toEqual([1, 10]);
    const flat = evolutionSeries([{ matchId: "x", playedAt: "2026-10-04T01:00:00Z", skill: 9.9, performance: null }], TZ);
    const [min, max] = evolutionDomain(flat);
    expect(max).toBe(10);
    expect(max - min).toBeGreaterThanOrEqual(2);
  });

  it("describe la serie para lectores de pantalla", () => {
    expect(evolutionSummary(evolutionSeries(history, TZ))).toBe(
      "Valoración de 6,1 a 6,8 (+0,7) en 3 partidos, 2 con calificaciones.",
    );
    expect(evolutionSummary([])).toBe("Todavía no hay partidos para mostrar la evolución.");
  });
});

describe("cara a cara", () => {
  it("sin coincidencias", () => {
    expect(headToHeadText(EMPTY_HEAD_TO_HEAD, "Brito", "Manu")).toEqual({
      headline: "Todavía no coincidieron en un partido",
      together: null,
      against: null,
    });
  });

  it("resume juntos y en contra", () => {
    const text = headToHeadText(
      { togetherMatches: 5, togetherWins: 3, togetherDraws: 1, togetherLosses: 1, againstMatches: 4, aWins: 1, bWins: 2, draws: 1 },
      "Brito",
      "Manu",
    );
    expect(text.headline).toBe("Manu gana el cara a cara 2–1");
    expect(text.together).toBe("5 partidos juntos · 3 PG · 1 PE · 1 PP");
    expect(text.against).toBe("4 partidos en contra · 1 empate");
  });

  it("empate en el duelo y nunca enfrentados", () => {
    expect(headToHeadText({ ...EMPTY_HEAD_TO_HEAD, againstMatches: 2, aWins: 1, bWins: 1 }, "A", "B").headline).toBe(
      "Parejos en el cara a cara (1–1)",
    );
    expect(headToHeadText({ ...EMPTY_HEAD_TO_HEAD, togetherMatches: 1, togetherWins: 1 }, "A", "B")).toMatchObject({
      headline: "Nunca se enfrentaron",
      together: "1 partido juntos · 1 PG · 0 PE · 0 PP",
    });
  });

  it("marca quién está mejor en cada fila", () => {
    const rows = compareRows(
      { matches: 10, wins: 6, draws: 2, losses: 2, goals: 8, assists: 2, mvps: 1, overall: 72 },
      { matches: 4, wins: 1, draws: 1, losses: 2, goals: 4, assists: 2, mvps: 0, overall: 65 },
    );
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
    expect(byKey.overall.better).toBe("a");
    expect(byKey.winRate).toMatchObject({ a: "70%", b: "38%", better: "a" });
    expect(byKey.goalsPerMatch).toMatchObject({ a: "0,8", b: "1,0", better: "b" });
    expect(byKey.assists.better).toBeNull();
  });

  it("sin partidos no compara porcentajes", () => {
    const zero = { matches: 0, wins: 0, draws: 0, losses: 0, goals: 0, assists: 0, mvps: 0, overall: 50 };
    const rows = compareRows(zero, zero);
    expect(rows.find((r) => r.key === "winRate")).toMatchObject({ a: "—", b: "—", better: null });
  });
});

describe("historial", () => {
  it("lee la página de la URL con límites", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("3")).toBe(3);
    expect(parsePage(["2", "5"])).toBe(2);
    expect(parsePage("-1")).toBe(1);
    expect(parsePage("1.5")).toBe(1);
    expect(parsePage("999")).toBe(25);
  });

  it("agrupa por mes local", () => {
    const items = [
      { id: "a", at: "2026-11-01T01:00:00Z" }, // 31/10 en Buenos Aires
      { id: "b", at: "2026-10-05T01:00:00Z" },
      { id: "c", at: "2026-09-30T23:00:00Z" },
    ];
    const groups = groupByMonth(items, (i) => i.at, TZ);
    expect(groups.map((g) => [g.label, g.items.map((i) => i.id)])).toEqual([
      ["Octubre 2026", ["a", "b"]],
      ["Septiembre 2026", ["c"]],
    ]);
    expect(monthLabel("2026-01")).toBe("Enero 2026");
  });

  it("promedia calificaciones ignorando faltantes", () => {
    expect(averageRating([6, 8, null])).toBe(7);
    expect(averageRating([null])).toBeNull();
  });

  it("arma el texto de goleadores", () => {
    const names: Record<string, string> = { b: "Brito", m: "Manu", t: "Tano", z: "Zurdo" };
    const nameOf = (id: string) => names[id];
    const tallies = tallyScorers(
      [{ playerId: "m" }, { playerId: "b" }, { playerId: "b" }, { playerId: null }, { playerId: "t" }, { playerId: "z" }],
      nameOf,
    );
    expect(tallies[0]).toEqual({ playerId: "b", count: 2 });
    expect(scorersText(tallies, nameOf)).toBe("Brito 2, Manu, Tano +1");
    expect(scorersText([], nameOf)).toBe("");
  });
});

describe("partidos del jugador", () => {
  it("resultado y aporte", () => {
    expect(resultOf(3, 1)).toBe("win");
    expect(resultOf(2, 2)).toBe("draw");
    expect(resultOf(0, 1)).toBe("loss");
    expect(contributionText({ goals: 2, assists: 1 })).toBe("2 G · 1 A");
    expect(contributionText({ goals: 0, assists: 1 })).toBe("1 A");
    expect(contributionText({ goals: 0, assists: 0 })).toBe("Sin goles");
  });

  it("últimos partidos del más reciente al más viejo", () => {
    const lines = [
      line({ matchId: "m1", playerId: "p", side: "a", scheduledAt: "2026-10-01T01:00:00Z" }),
      line({ matchId: "m3", playerId: "p", side: "a", scheduledAt: "2026-10-15T01:00:00Z" }),
      line({ matchId: "m2", playerId: "p", side: "b", scheduledAt: "2026-10-08T01:00:00Z" }),
      line({ matchId: "m9", playerId: "otro", side: "b", scheduledAt: "2026-10-20T01:00:00Z" }),
    ];
    expect(recentLines(lines, "p", 2).map((l) => l.matchId)).toEqual(["m3", "m2"]);
  });

  it("valoración visible con respaldo en el nivel inicial", () => {
    expect(displayRating(6, { skill: 7.2, isProvisional: false })).toEqual({ rating: 7.2, isProvisional: false });
    expect(displayRating(6, undefined)).toEqual({ rating: 6, isProvisional: true });
    expect(displayRating(6, { skill: Number.NaN, isProvisional: false })).toEqual({ rating: 6, isProvisional: true });
  });
});

describe("rankings: presentación", () => {
  it("tiene las 8 pestañas y resuelve el slug", () => {
    expect(RANKING_TABS).toHaveLength(8);
    expect(new Set(RANKING_TABS.map((t) => t.slug)).size).toBe(8);
    expect(rankingTabBySlug("goleadores").kind).toBe("scorers");
    expect(rankingTabBySlug("cualquiera").kind).toBe("best");
  });

  it("lee el mínimo de partidos", () => {
    expect(parseMinMatches(undefined, 3)).toBe(3);
    expect(parseMinMatches("5", 3)).toBe(5);
    expect(parseMinMatches("0", 3)).toBe(3);
    expect(parseMinMatches("200", 3)).toBe(50);
    expect(parseMinMatches("x", 0)).toBe(1);
  });

  it("explica quiénes quedan afuera", () => {
    expect(excludedLabel("best", 3, 3)).toBe("3 jugadores no llegan al mínimo de 3 partidos.");
    expect(excludedLabel("winRate", 1, 1)).toBe("1 jugador no llega al mínimo de 1 partido.");
    expect(excludedLabel("bestAverage", 2, 4)).toBe("2 jugadores no llegan al mínimo de 4 partidos con votos.");
    expect(excludedLabel("scorers", 4, 3)).toBe("4 jugadores sin goles.");
    expect(excludedLabel("mvps", 0, 3)).toBeNull();
    expect(emptyRankingText("best", 2)).toContain("2 partidos");
  });
});
