import { describe, expect, it } from "vitest";
import { predictionHit, predictionPoints, predictionStandings } from "./member";

describe("puntos de un pronóstico", () => {
  it("3 por el exacto, 1 por el ganador o el empate, 0 si no", () => {
    expect(predictionPoints({ a: 3, b: 1 }, { a: 3, b: 1 })).toBe(3);
    expect(predictionPoints({ a: 2, b: 0 }, { a: 3, b: 1 })).toBe(1);
    expect(predictionPoints({ a: 1, b: 1 }, { a: 2, b: 2 })).toBe(1);
    expect(predictionPoints({ a: 0, b: 1 }, { a: 3, b: 1 })).toBe(0);
    expect(predictionHit({ a: 2, b: 2 }, { a: 2, b: 2 })).toBe("exact");
  });
});

describe("tabla de pronosticadores", () => {
  it("ordena por puntos, exactos y eficacia; ignora los pendientes", () => {
    const standings = predictionStandings([
      { profileId: "ana", matchId: "m1", prediction: { a: 2, b: 1 }, result: { a: 2, b: 1 } }, // 3
      { profileId: "ana", matchId: "m2", prediction: { a: 0, b: 0 }, result: { a: 1, b: 0 } }, // 0
      { profileId: "beto", matchId: "m1", prediction: { a: 1, b: 0 }, result: { a: 2, b: 1 } }, // 1
      { profileId: "beto", matchId: "m2", prediction: { a: 3, b: 0 }, result: { a: 1, b: 0 } }, // 1
      { profileId: "beto", matchId: "m3", prediction: { a: 3, b: 0 }, result: null }, // pendiente
      { profileId: "caro", matchId: "m1", prediction: { a: 5, b: 1 }, result: { a: 2, b: 1 } }, // 1
      { profileId: "caro", matchId: "m2", prediction: { a: 1, b: 0 }, result: { a: 1, b: 0 } }, // 3
    ]);
    expect(standings.map((s) => [s.profileId, s.points, s.exact, s.played])).toEqual([
      ["caro", 4, 1, 2],
      ["ana", 3, 1, 2],
      ["beto", 2, 0, 2],
    ]);
  });
});
