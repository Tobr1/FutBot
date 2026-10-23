import { describe, expect, it } from "vitest";
import { votingShareMessage } from "./share";

describe("votingShareMessage", () => {
  it("arma el aviso con resultado, plazo y link", () => {
    expect(
      votingShareMessage({
        groupName: "Los del Sábado",
        dayLabel: "Sáb 25/10",
        scoreLine: "Azul 3–2 Rojo",
        timeLeft: "1 día 3 h",
        url: "https://fulbot.app/g/x/partidos/1/votar",
      }),
    ).toBe(
      [
        "🗳️ *Los del Sábado* · votación del partido del Sáb 25/10",
        "Azul 3–2 Rojo",
        "",
        "Calificá a los que jugaron y elegí al jugador del partido. Es anónimo.",
        "Cierra en 1 día 3 h 👉 https://fulbot.app/g/x/partidos/1/votar",
      ].join("\n"),
    );
  });

  it("sin resultado no deja una línea vacía de más", () => {
    const text = votingShareMessage({ groupName: "G", dayLabel: "Dom 1/11", timeLeft: "5 h", url: "u" });
    expect(text.split("\n")[1]).toBe("");
  });
});
