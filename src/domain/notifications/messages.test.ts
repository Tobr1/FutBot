import { describe, expect, it } from "vitest";
import { matchCreatedMessage, validationRequestMessage, votingOpenMessage } from "./messages";

const BA = "America/Argentina/Buenos_Aires";

describe("textos de los avisos", () => {
  it("partido nuevo: día, hora y cancha", () => {
    const m = matchCreatedMessage({
      groupName: "Los del Sábado",
      scheduledAt: "2026-10-25T01:00:00Z",
      timeZone: BA,
      venue: "La Bombonera",
      url: "/g/sabado/partidos/m1",
      matchId: "m1",
    });
    expect(m.title).toBe("Partido nuevo en Los del Sábado");
    expect(m.body).toBe("Sáb 24/10 · 22:00 · La Bombonera. ¿Vas? Confirmalo en FulBot.");
    expect(m.tag).toBe("match-m1");
  });

  it("votación abierta: con el marcador si está", () => {
    const m = votingOpenMessage({
      groupName: "Los del Sábado",
      scheduledAt: "2026-10-25T01:00:00Z",
      timeZone: BA,
      scoreA: 3,
      scoreB: 2,
      url: "/g/sabado/partidos/m1/votar",
      matchId: "m1",
    });
    expect(m.body).toContain("Sáb 24/10 · 22:00 (3–2)");
  });

  it("validar compañeros: el nombre en el título", () => {
    const m = validationRequestMessage({ groupName: "Los del Sábado", nickname: "Fran", url: "/g/sabado/validar", playerId: "p1" });
    expect(m.title).toBe("Fran quiere que lo valides");
  });
});
