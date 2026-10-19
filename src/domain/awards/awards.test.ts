import { describe, expect, it } from "vitest";
import { matchLines, saturday } from "@/domain/stats/test-fixtures";
import {
  type Award,
  awardProgress,
  awardsForMatch,
  awardsForPlayer,
  computeAwards,
  computeRecords,
  groupAwards,
  latestAwards,
  monthlyAwards,
  pickSeasonChampion,
} from ".";
import type { RatingResult } from "@/domain/rating";

const TZ = "America/Argentina/Buenos_Aires";
const kinds = (list: Award[]) => list.map((a) => a.kind).sort();

describe("computeAwards por partido", () => {
  const lines = [
    ...matchLines("m1", saturday(0), ["brito", "manu"], ["tano", "arq"], [4, 0], {
      brito: { g: 3, a: 1, mvp: true },
      manu: { g: 1, a: 3 },
    }),
    ...matchLines("m2", saturday(1), ["brito", "tano"], ["manu", "arq"], [2, 2], { tano: { g: 2 } }),
  ];
  const awards = computeAwards({ lines, timeZone: TZ, positions: { arq: "goalkeeper", tano: "defender" } });

  it("da hat-trick, asistidor serial, primer MVP y debut en el primer partido", () => {
    const m1 = awardsForMatch(awards, "m1");
    expect(kinds(m1.filter((a) => a.playerId === "brito"))).toEqual(["debut", "hat-trick", "mvp"]);
    expect(kinds(m1.filter((a) => a.playerId === "manu"))).toEqual(["assists", "debut"]);
    const hat = m1.find((a) => a.kind === "hat-trick")!;
    expect(hat).toMatchObject({ tier: "gold", icon: "Flame", description: "3 goles en un partido", earnedAt: saturday(0), matchId: "m1" });
    // Los de oro primero.
    expect(m1[0].tier).toBe("gold");
  });

  it("da doblete con exactamente 2 goles", () => {
    expect(awardsForPlayer(awards, "tano").some((a) => a.kind === "brace" && a.matchId === "m2")).toBe(true);
  });

  it("valla invicta solo para arqueros y defensores cuyo equipo no recibió goles", () => {
    const clean = awards.filter((a) => a.kind === "clean-sheet");
    // m1: Brito y Manu ganaron 4-0 pero no son arqueros ni defensores.
    expect(clean).toEqual([]);
    const shutout = computeAwards({
      lines: matchLines("m9", saturday(0), ["arq", "tano"], ["x"], [1, 0]),
      timeZone: TZ,
      positions: { arq: "goalkeeper", tano: "defender", x: "forward" },
    });
    expect(shutout.filter((a) => a.kind === "clean-sheet").map((a) => a.playerId).sort()).toEqual(["arq", "tano"]);
  });

  it("los ids son únicos y la lista va del más reciente al más viejo", () => {
    expect(new Set(awards.map((a) => a.id)).size).toBe(awards.length);
    const dates = awards.map((a) => Date.parse(a.earnedAt));
    expect([...dates].sort((x, y) => y - x)).toEqual(dates);
  });
});

describe("rachas e hitos", () => {
  // Brito gana 5 seguidos, después pierde; juega los 6 partidos.
  const lines = Array.from({ length: 6 }, (_, i) =>
    matchLines(`m${i}`, saturday(i), ["brito"], ["rival"], i < 5 ? [2, 1] : [0, 1], { brito: { mvp: i < 5 } }),
  ).flat();
  const awards = awardsForPlayer(computeAwards({ lines, timeZone: TZ, today: "2026-11-10" }), "brito");

  it("racha ganadora de 3 y de 5, invicto a los 5", () => {
    const streaks = awards.filter((a) => a.kind === "win-streak");
    expect(streaks.map((a) => [a.description, a.tier, a.matchId])).toEqual([
      ["5 victorias seguidas", "silver", "m4"],
      ["3 victorias seguidas", "bronze", "m2"],
    ]);
    expect(awards.find((a) => a.kind === "unbeaten")?.matchId).toBe("m4");
  });

  it("MVP por escalones (1 y 5) y asistencia a los 5 seguidos", () => {
    expect(awards.filter((a) => a.kind === "mvp").map((a) => a.title)).toEqual(["5 veces MVP", "Primer MVP"]);
    expect(awards.filter((a) => a.kind === "attendance").map((a) => a.description)).toEqual(["5 partidos seguidos sin faltar"]);
  });

  it("faltar corta la racha de asistencia", () => {
    const withGap = [
      ...matchLines("a", saturday(0), ["p"], ["q"], [1, 0]),
      ...matchLines("b", saturday(1), ["p"], ["q"], [1, 0]),
      ...matchLines("c", saturday(2), ["r"], ["q"], [1, 0]),
      ...matchLines("d", saturday(3), ["p"], ["q"], [1, 0]),
      ...matchLines("e", saturday(4), ["p"], ["q"], [1, 0]),
      ...matchLines("f", saturday(5), ["p"], ["q"], [1, 0]),
    ];
    const all = computeAwards({ lines: withGap, timeZone: TZ });
    expect(all.filter((a) => a.kind === "attendance").map((a) => a.playerId)).toEqual(["q"]);
  });

  it("hito de 10 partidos", () => {
    const ten = Array.from({ length: 10 }, (_, i) => matchLines(`t${i}`, saturday(i), ["p"], ["q"], [0, 0])).flat();
    const p = awardsForPlayer(computeAwards({ lines: ten, timeZone: TZ }), "p");
    expect(p.find((a) => a.kind === "matches")).toMatchObject({ title: "10 partidos", tier: "bronze", matchId: "t9" });
  });
});

describe("premios del mes", () => {
  // Octubre: Brito 3 goles, Manu 3 goles (empate). Noviembre en curso.
  const lines = [
    ...matchLines("o1", "2026-10-04T01:00:00Z", ["brito"], ["manu"], [2, 1], { brito: { g: 2, mvp: true }, manu: { g: 1 } }),
    ...matchLines("o2", "2026-10-25T01:00:00Z", ["brito"], ["manu"], [1, 2], { brito: { g: 1 }, manu: { g: 2, mvp: true } }),
    ...matchLines("n1", "2026-11-08T01:00:00Z", ["brito"], ["manu"], [5, 0], { brito: { g: 5, mvp: true } }),
  ];

  it("solo premia meses cerrados y comparte el goleador si hay empate", () => {
    const months = monthlyAwards({ lines, timeZone: TZ, today: "2026-11-10" });
    expect(months.map((m) => m.key)).toEqual(["2026-10"]);
    expect(months[0].scorers).toEqual([
      { playerId: "brito", value: 3 },
      { playerId: "manu", value: 3 },
    ]);
    const awards = computeAwards({ lines, timeZone: TZ, today: "2026-11-10" }).filter((a) => a.kind === "month-scorer");
    expect(awards.map((a) => a.description)).toEqual(["Octubre 2026 · 3 goles (compartido)", "Octubre 2026 · 3 goles (compartido)"]);
    expect(awards[0].earnedAt).toBe("2026-10-25T01:00:00Z");
  });

  it("desempata el MVP del mes por promedio de calificación", () => {
    const months = monthlyAwards({
      lines,
      timeZone: TZ,
      today: "2026-11-10",
      performances: { o1: { performances: { brito: 7 } }, o2: { performances: { manu: 8.5 } } },
    });
    expect(months[0].mvps).toEqual([{ playerId: "manu", value: 1 }]);
  });

  it("sin 'hoy', un mes se cierra cuando hay partidos en un mes posterior", () => {
    expect(monthlyAwards({ lines, timeZone: TZ }).map((m) => m.key)).toEqual(["2026-10"]);
    // Al pasar a diciembre se cierra noviembre.
    expect(monthlyAwards({ lines, timeZone: TZ, today: "2026-12-01" }).map((m) => m.key)).toEqual(["2026-11", "2026-10"]);
  });

  it("un mes con la votación de un partido todavía abierta no se cierra", () => {
    // 31/10 22:00 en Buenos Aires, votación abierta hasta el 1/11 22:00.
    const edge = [...lines, ...matchLines("o3", "2026-11-01T01:00:00Z", ["brito"], ["manu"], [0, 1], { manu: { g: 1 } })];
    expect(monthlyAwards({ lines: edge, timeZone: TZ, today: "2026-11-01", openVotingAt: ["2026-11-01T01:00:00Z"] })).toEqual([]);
    expect(
      computeAwards({ lines: edge, timeZone: TZ, today: "2026-11-01", openVotingAt: ["2026-11-01T01:00:00Z"] }).filter((a) =>
        a.kind.startsWith("month-"),
      ),
    ).toEqual([]);
    // Cerrada la votación, se premia octubre.
    expect(monthlyAwards({ lines: edge, timeZone: TZ, today: "2026-11-02", openVotingAt: [] }).map((m) => m.key)).toEqual(["2026-10"]);
  });

  it("usa la fecha local del grupo para el mes", () => {
    // 31/10 22:00 en Buenos Aires = 01:00 Z del 1/11: cuenta para octubre.
    const edge = matchLines("e", "2026-11-01T01:00:00Z", ["p"], ["q"], [1, 0], { p: { g: 1 } });
    expect(monthlyAwards({ lines: edge, timeZone: TZ, today: "2026-11-02" })[0].key).toBe("2026-10");
  });
});

describe("mejor promedio de la temporada", () => {
  it("toma al primero de 'Mejor promedio' y lo premia con el último partido de la temporada", () => {
    const result = {
      engineVersion: "v1",
      byMatch: {},
      byPlayer: {
        a: { matches: 4, skill: 7, conservative: 6, consistency: null, recentForm: null, performanceAvg: 7.2, matchesWithVotes: 4 },
        b: { matches: 1, skill: 7, conservative: 5, consistency: null, recentForm: null, performanceAvg: 8.1, matchesWithVotes: 1 },
      },
    } as unknown as RatingResult;
    expect(pickSeasonChampion(result, 3)).toMatchObject({ playerId: "a", display: "7,2" });
    expect(pickSeasonChampion(result, 1)).toMatchObject({ playerId: "b" });

    const lines = [
      ...matchLines("s1", "2025-11-01T01:00:00Z", ["a"], ["b"], [1, 0]),
      ...matchLines("s2", "2025-12-20T01:00:00Z", ["a"], ["b"], [1, 0]),
      ...matchLines("s3", "2026-01-10T01:00:00Z", ["a"], ["b"], [1, 0]),
    ];
    const awards = computeAwards({
      lines,
      timeZone: TZ,
      seasonChampions: [{ seasonId: "s2025", seasonName: "2025", range: { from: "2025-01-01", to: "2025-12-31" }, playerId: "a", display: "7,2" }],
    }).filter((x) => x.kind === "season-best");
    expect(awards).toEqual([
      expect.objectContaining({ playerId: "a", description: "Temporada 2025 · 7,2", earnedAt: "2025-12-20T01:00:00Z", tier: "gold", matchId: null }),
    ]);
  });
});

describe("lecturas", () => {
  const lines = [
    ...matchLines("m1", saturday(0), ["p"], ["q"], [3, 0], { p: { g: 2 } }),
    ...matchLines("m2", saturday(1), ["p"], ["q"], [3, 0], { p: { g: 2 } }),
    ...matchLines("m3", saturday(2), ["p"], ["q"], [3, 1], { p: { g: 3, a: 1 }, q: { g: 1 } }),
  ];
  const awards = computeAwards({ lines, timeZone: TZ });

  it("agrupa los repetidos con el más reciente y pone primero los de oro", () => {
    const groups = groupAwards(awardsForPlayer(awards, "p"));
    expect(groups[0].award.kind).toBe("hat-trick");
    const brace = groups.find((g) => g.award.kind === "brace")!;
    expect(brace.count).toBe(2);
    expect(brace.award.matchId).toBe("m2");
  });

  it("el feed no muestra debuts", () => {
    expect(latestAwards(awards, 10).some((a) => a.kind === "debut")).toBe(false);
    expect(latestAwards(awards, 2)).toHaveLength(2);
  });

  it("progreso hacia el próximo escalón", () => {
    const progress = awardProgress(lines, "p");
    expect(progress.find((p) => p.key === "matches")).toMatchObject({ current: 3, target: 10, complete: false });
    expect(progress.find((p) => p.key === "win-streak")).toMatchObject({ current: 3, target: 5, tier: "silver" });
    expect(progress.find((p) => p.key === "mvp")).toMatchObject({ current: 0, target: 1 });
    expect(awardProgress([], "nadie").every((p) => p.current === 0)).toBe(true);
  });

  it("récords del grupo: el primero en lograrlo se queda con el empate", () => {
    const records = computeRecords([
      ...lines,
      ...matchLines("m4", saturday(3), ["q"], ["p"], [3, 0], { q: { g: 3 } }),
    ]);
    const goals = records.players.find((r) => r.kind === "goals-in-match")!;
    expect(goals).toMatchObject({ playerId: "p", value: 3, matchId: "m3", display: "3 goles" });
    expect(records.players.find((r) => r.kind === "win-streak")).toMatchObject({ playerId: "p", value: 3 });
    expect(records.matches.find((r) => r.kind === "biggest-win")).toMatchObject({ matchId: "m1", display: "3–0" });
    expect(records.matches.find((r) => r.kind === "most-goals")).toMatchObject({ matchId: "m3", display: "3–1 · 4 goles" });
    expect(computeRecords([])).toEqual({ players: [], matches: [] });
  });
});
