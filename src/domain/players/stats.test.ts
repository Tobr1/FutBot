import { describe, expect, it } from "vitest";
import { effectiveness } from "./stats";

describe("effectiveness", () => {
  it("devuelve null sin partidos jugados", () => {
    expect(effectiveness({ matches: 0, wins: 0, draws: 0 })).toBeNull();
  });

  it("cuenta las victorias completas", () => {
    expect(effectiveness({ matches: 4, wins: 4, draws: 0 })).toBe(100);
    expect(effectiveness({ matches: 4, wins: 1, draws: 0 })).toBe(25);
    expect(effectiveness({ matches: 5, wins: 0, draws: 0 })).toBe(0);
  });

  it("suma medio punto por empate", () => {
    expect(effectiveness({ matches: 4, wins: 2, draws: 2 })).toBe(75);
    expect(effectiveness({ matches: 2, wins: 0, draws: 1 })).toBe(25);
  });

  it("redondea al entero más cercano", () => {
    expect(effectiveness({ matches: 3, wins: 1, draws: 0 })).toBe(33);
    expect(effectiveness({ matches: 3, wins: 2, draws: 0 })).toBe(67);
    expect(effectiveness({ matches: 7, wins: 3, draws: 1 })).toBe(50);
  });
});
