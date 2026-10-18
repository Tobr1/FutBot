import { describe, expect, it } from "vitest";
import { hueFor } from "./color";

describe("hueFor", () => {
  it("es estable para el mismo nombre", () => {
    expect(hueFor("Los del Sábado")).toBe(hueFor("Los del Sábado"));
  });

  it("siempre devuelve un tono entre 0 y 359", () => {
    for (const name of ["", "a", "Brito", "Juan Cruz", "Fútbol 5 de los jueves", "🙂⚽️", "x".repeat(500)]) {
      const hue = hueFor(name);
      expect(Number.isInteger(hue)).toBe(true);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it("mantiene el algoritmo de UserAvatar (hash * 31 + código, sin signo)", () => {
    expect(hueFor("")).toBe(0);
    expect(hueFor("a")).toBe(97);
    expect(hueFor("ab")).toBe((97 * 31 + 98) % 360);
  });

  it("distingue nombres distintos", () => {
    expect(hueFor("Brito")).not.toBe(hueFor("Brita"));
  });
});
