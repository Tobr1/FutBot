import { describe, expect, it } from "vitest";
import { eloExpected } from "./engine";
import { winProbability } from "./predict";

const total = (p: { a: number; draw: number; b: number }) => p.a + p.draw + p.b;

describe("winProbability", () => {
  it("equipos parejos: mismas chances y empate máximo de 0,25", () => {
    const p = winProbability([6, 7, 5], [6, 6, 6]);
    expect(p.a).toBeCloseTo(0.375, 12);
    expect(p.b).toBeCloseTo(0.375, 12);
    expect(p.draw).toBeCloseTo(0.25, 12);
  });

  it("siempre suma 1", () => {
    for (const [a, b] of [
      [[5], [9]],
      [[1, 2], [10, 10]],
      [[7.3, 6.1, 5.5], [6.8, 6.2, 5.9]],
    ]) {
      expect(total(winProbability(a, b))).toBeCloseTo(1, 12);
    }
  });

  it("es simétrico al invertir los equipos", () => {
    const ab = winProbability([7, 6], [5, 5.5]);
    const ba = winProbability([5, 5.5], [7, 6]);
    expect(ab.a).toBeCloseTo(ba.b, 12);
    expect(ab.b).toBeCloseTo(ba.a, 12);
    expect(ab.draw).toBeCloseTo(ba.draw, 12);
  });

  it("favorece al equipo más fuerte con el esperado Elo del motor", () => {
    const p = winProbability([7], [5]);
    expect(p.a).toBeGreaterThan(p.b);
    expect(p.a / (p.a + p.b)).toBeCloseTo(eloExpected(7, 5, 2), 12);
    expect(p.draw).toBeCloseTo(0.25 * (1 - Math.abs(2 * eloExpected(7, 5, 2) - 1)), 12);
  });

  it("con mucha diferencia el empate casi desaparece", () => {
    const p = winProbability([10, 10], [1, 1]);
    expect(p.draw).toBeLessThan(0.01);
    expect(p.a).toBeGreaterThan(0.99);
  });

  it("respeta la configuración", () => {
    const p = winProbability([6], [6], { prediction: { drawFactor: 0 } });
    expect(p).toEqual({ a: 0.5, draw: 0, b: 0.5 });
    const flatter = winProbability([7], [5], { results: { eloScale: 4 } });
    expect(flatter.a).toBeLessThan(winProbability([7], [5]).a);
  });

  it("sin habilidades en un equipo asume paridad", () => {
    expect(winProbability([], [7])).toEqual(winProbability([6], [6]));
  });
});
