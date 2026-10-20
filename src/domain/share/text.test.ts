import { describe, expect, it } from "vitest";
import { matchShareMessage, playerShareMessage, scorerLabel, shareFileName, whatsappShareUrl } from "./text";

describe("textos para compartir", () => {
  it("resultado con goleadores y MVP", () => {
    expect(
      matchShareMessage({
        groupName: "Los del Sábado",
        dateLabel: "Sáb 25/10",
        teams: { a: { name: "Azul", score: 5 }, b: { name: "Rojo", score: 3 } },
        scorers: ["Brito ×2", "Manu"],
        mvp: "Brito",
      }),
    ).toBe("Los del Sábado · Sáb 25/10\nAzul 5–3 Rojo\nGoles: Brito ×2, Manu\nMVP: Brito");
  });

  it("resultado sin goles ni MVP", () => {
    expect(
      matchShareMessage({ groupName: "G", dateLabel: "Sáb 25/10", teams: { a: { name: "Azul", score: 0 }, b: { name: "Rojo", score: 0 } } }),
    ).toBe("G · Sáb 25/10\nAzul 0–0 Rojo");
  });

  it("ficha", () => {
    expect(playerShareMessage({ nickname: "Brito", groupName: "Los del Sábado", overall: 78, tierLabel: "Figura", matches: 24, goals: 1, mvps: 0 })).toBe(
      "Brito en Los del Sábado: 78 · Figura · 24 PJ · 1 gol",
    );
    expect(playerShareMessage({ nickname: "B", groupName: "G", overall: 80, tierLabel: "Crack", matches: 3, goals: 5, mvps: 2 })).toContain("· 5 goles · 2 MVP");
  });

  it("nombres de archivo sin acentos ni espacios", () => {
    expect(shareFileName("partido", "2026-10-25")).toBe("fulbot-partido-2026-10-25.png");
    expect(shareFileName("Chino Rodríguez")).toBe("fulbot-chino-rodriguez.png");
    expect(shareFileName("¡!")).toBe("fulbot.png");
  });

  it("link de WhatsApp y goleadores", () => {
    expect(whatsappShareUrl("Hola", "https://x.test/a")).toBe("https://wa.me/?text=Hola%0Ahttps%3A%2F%2Fx.test%2Fa");
    expect(scorerLabel("Brito", 2)).toBe("Brito ×2");
    expect(scorerLabel("Manu", 1)).toBe("Manu");
  });
});
