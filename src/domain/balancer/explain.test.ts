import { describe, expect, it } from "vitest";
import { balanceTeams } from "./balance";
import { evaluateSplit } from "./cost";
import { explainSplit, formatDecimal } from "./explain";
import type { BalancerPlayer, Position, TeamSplit } from "./types";

const p = (id: string, name: string, skill: number, primary: Position | null, sigma = 0.5): BalancerPlayer => ({
  id,
  name,
  skill,
  primary,
  sigma,
});

const players: BalancerPlayer[] = [
  p("gk1", "Tano", 6, "goalkeeper"),
  p("gk2", "Pato", 6, "goalkeeper"),
  p("d1", "Brito", 7, "defender"),
  p("d2", "Manu", 6.5, "defender"),
  p("d3", "Lucho", 5.5, "defender"),
  p("d4", "Ruso", 6, "defender"),
  p("f1", "Pipa", 8, "forward"),
  p("f2", "Chino", 5, "forward", 2.5),
  p("f3", "Colo", 7, "forward", 2.5),
  p("f4", "Nacho", 5.5, "forward"),
];

const split = (a: string[], b: string[], options = {}): TeamSplit => ({ a, b, ...evaluateSplit(players, a, b, options) });

describe("formatDecimal", () => {
  it("usa coma decimal y un decimal", () => {
    expect(formatDecimal(0.3)).toBe("0,3");
    expect(formatDecimal(1.84)).toBe("1,8");
    expect(formatDecimal(12)).toBe("12,0");
    expect(formatDecimal(-0.01)).toBe("0,0");
  });
});

describe("explainSplit", () => {
  it("explica nivel, arqueros, posiciones y nuevos", () => {
    const s = split(["gk1", "d1", "d3", "f1", "f2"], ["gk2", "d2", "d4", "f3", "f4"]);
    // A: 6 + 7 + 5,5 + 8 + 5 = 31,5 · B: 6 + 6,5 + 6 + 7 + 5,5 = 31 → 0,5 / 5 = 0,1
    expect(explainSplit(s, players)).toEqual([
      "Diferencia de nivel: 0,1 puntos (1,6 %).",
      "Un arquero por equipo.",
      "Defensas 2–2 · Delanteros 2–2.",
      "Los 2 jugadores nuevos quedaron separados.",
    ]);
  });

  it("menciona restricciones, fijados y cambios respecto del último partido", () => {
    const constraints = {
      apart: [["d1", "d2"]] as Array<[string, string]>,
      together: [["f1", "f4"]] as Array<[string, string]>,
      pinned: { gk1: "a" as const },
    };
    const previousTeams = { a: ["gk1", "d1", "d2", "d3", "f1"], b: ["gk2", "d4", "f2", "f3", "f4"] };
    const s = split(["gk1", "d1", "d3", "f1", "f4"], ["gk2", "d2", "d4", "f2", "f3"], { previousTeams });
    const lines = explainSplit(s, players, constraints);
    expect(lines).toContain("Brito y Manu juegan separados (restricción).");
    expect(lines).toContain("Pipa y Nacho juegan juntos (restricción).");
    expect(lines).toContain("Tano quedó fijado en el equipo A.");
    expect(lines).toContain("Equipos distintos al último partido (2 cambios).");
    expect(lines).toContain("Jugadores nuevos: 0–2.");
  });

  it("avisa restricciones incumplidas en un armado manual y usa nombres de equipo", () => {
    const s = split(["gk1", "gk2", "d1", "d2", "f1"], ["d3", "d4", "f2", "f3", "f4"]);
    const lines = explainSplit(s, players, { apart: [["d1", "d2"]], pinned: { f1: "b" } }, { teamNames: { a: "Azul", b: "Rojo" } });
    expect(lines).toContain("Los 2 arqueros quedaron en el mismo equipo.");
    expect(lines).toContain("Brito y Manu deberían jugar separados y quedaron juntos.");
    expect(lines).toContain("Pipa estaba fijado en el equipo Rojo y quedó en el otro.");
  });

  it("explica cantidad impar, arquero único y equipos repetidos", () => {
    const odd = players.slice(1, 10);
    const previousTeams = { a: ["gk2", "d1", "d2", "d3"], b: ["d4", "f1", "f2", "f3", "f4"] };
    const s: TeamSplit = {
      a: previousTeams.a,
      b: previousTeams.b,
      ...evaluateSplit(odd, previousTeams.a, previousTeams.b, { previousTeams }),
    };
    const lines = explainSplit(s, odd);
    expect(lines).toContain("Juegan 5 contra 4: el equipo con uno menos tiene jugadores algo mejores.");
    expect(lines).toContain("Un solo arquero natural: juega en el equipo A.");
    expect(lines).toContain("Mismos equipos que el último partido.");
  });

  it("explica el mejor armado de balanceTeams", () => {
    const result = balanceTeams(players, { apart: [["d1", "d2"]] });
    const lines = explainSplit(result.alternatives[0], players, { apart: [["d1", "d2"]] });
    expect(lines[0]).toMatch(/^Diferencia de nivel: \d+,\d puntos \(\d+,\d %\)\.$/);
    expect(lines).toContain("Un arquero por equipo.");
    expect(lines).toContain("Brito y Manu juegan separados (restricción).");
    expect(lines).toContain("Los 2 jugadores nuevos quedaron separados.");
  });

  it("muestra la forma reciente solo si alguien la tiene", () => {
    const withForm = players.map((x, i) => ({ ...x, form: i === 0 ? 1 : 0 }));
    const s: TeamSplit = { a: ["gk1", "d1", "d3", "f1", "f2"], b: ["gk2", "d2", "d4", "f3", "f4"], ...evaluateSplit(withForm, ["gk1", "d1", "d3", "f1", "f2"], ["gk2", "d2", "d4", "f3", "f4"]) };
    expect(explainSplit(s, withForm)).toContain("Forma reciente: diferencia de 0,2 puntos.");
    expect(explainSplit(s, players).some((l) => l.startsWith("Forma"))).toBe(false);
  });
});
