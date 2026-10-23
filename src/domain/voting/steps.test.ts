import { describe, expect, it } from "vitest";
import { firstPendingIndex, stepStatus, summaryLabel, votingSummary } from "./steps";

const ids = ["a", "b", "c", "d"];

describe("votación paso a paso", () => {
  it("un jugador está calificado, marcado como no visto o pendiente", () => {
    const skipped = new Set(["b"]);
    expect(stepStatus("a", { a: 7 }, skipped)).toBe("rated");
    expect(stepStatus("b", { a: 7 }, skipped)).toBe("skipped");
    expect(stepStatus("c", { a: 7, c: null }, skipped)).toBe("pending");
  });

  it("calificar le gana a 'no lo vi' (si después lo calificó)", () => {
    expect(stepStatus("b", { b: 8 }, new Set(["b"]))).toBe("rated");
  });

  it("una calificación fuera de 1-10 no cuenta", () => {
    expect(stepStatus("a", { a: 0 }, new Set())).toBe("pending");
    expect(stepStatus("a", { a: 11 }, new Set())).toBe("pending");
  });

  it("resume y encuentra el primero sin responder", () => {
    const draft = { a: 7, d: 5 };
    const skipped = new Set(["b"]);
    expect(votingSummary(ids, draft, skipped)).toEqual({ rated: 2, skipped: 1, pending: 1 });
    expect(firstPendingIndex(ids, draft, skipped)).toBe(2);
    expect(firstPendingIndex(ids, { a: 1, b: 2, c: 3, d: 4 }, new Set())).toBe(-1);
  });

  it("arma el texto del resumen sin partes en cero", () => {
    expect(summaryLabel({ rated: 6, skipped: 2, pending: 1 })).toBe("Calificaste a 6 · 2 no los viste · falta 1");
    expect(summaryLabel({ rated: 3, skipped: 1, pending: 0 })).toBe("Calificaste a 3 · 1 no lo viste");
    expect(summaryLabel({ rated: 0, skipped: 0, pending: 4 })).toBe("faltan 4");
    expect(summaryLabel({ rated: 0, skipped: 0, pending: 0 })).toBe("Todavía no calificaste a nadie");
  });
});
