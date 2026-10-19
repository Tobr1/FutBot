import { describe, expect, it } from "vitest";
import {
  balanceGapPercent,
  balanceLabel,
  balanceShare,
  cleanTeamName,
  cycleSide,
  snakeDraft,
  teamsSaveIssue,
  teamStrength,
} from "./teams";

describe("cycleSide", () => {
  it("recorre Sin equipo → A → B → Sin equipo", () => {
    expect(cycleSide(null)).toBe("a");
    expect(cycleSide("a")).toBe("b");
    expect(cycleSide("b")).toBeNull();
  });
});

describe("teamStrength", () => {
  it("suma y promedia con un decimal", () => {
    expect(teamStrength([7, 6.5, 5])).toEqual({ count: 3, sum: 18.5, avg: 6.2 });
  });

  it("un equipo vacío no tiene promedio", () => {
    expect(teamStrength([])).toEqual({ count: 0, sum: 0, avg: null });
  });
});

describe("equilibrio", () => {
  it("compara por suma", () => {
    const a = teamStrength([8, 6]);
    const b = teamStrength([7, 7]);
    expect(balanceShare(a, b)).toBe(0.5);
    expect(balanceGapPercent(a, b)).toBe(0);
  });

  it("calcula la diferencia en porcentaje", () => {
    const a = teamStrength([6, 6]); // 12
    const b = teamStrength([4, 4]); // 8
    expect(balanceShare(a, b)).toBeCloseTo(0.6);
    expect(balanceGapPercent(a, b)).toBe(40);
  });

  it("sin jugadores queda al medio", () => {
    expect(balanceShare(teamStrength([]), teamStrength([]))).toBe(0.5);
    expect(balanceGapPercent(teamStrength([]), teamStrength([]))).toBe(0);
  });

  it("etiqueta la diferencia", () => {
    expect(balanceLabel(3)).toBe("parejo");
    expect(balanceLabel(10)).toBe("leve");
    expect(balanceLabel(30)).toBe("desparejo");
  });
});

describe("snakeDraft", () => {
  const players = [
    { id: "1", nickname: "Uno", rating: 9 },
    { id: "2", nickname: "Dos", rating: 8 },
    { id: "3", nickname: "Tres", rating: 7 },
    { id: "4", nickname: "Cuatro", rating: 6 },
    { id: "5", nickname: "Cinco", rating: 5 },
    { id: "6", nickname: "Seis", rating: 4 },
  ];

  it("reparte A, B, B, A, A, B por nivel", () => {
    expect(snakeDraft(players)).toEqual({ a: ["1", "4", "5"], b: ["2", "3", "6"] });
  });

  it("no depende del orden de entrada", () => {
    expect(snakeDraft([...players].reverse())).toEqual(snakeDraft(players));
  });

  it("desempata por apodo", () => {
    const tied = [
      { id: "x", nickname: "Zeta", rating: 5 },
      { id: "y", nickname: "Alfa", rating: 5 },
    ];
    expect(snakeDraft(tied)).toEqual({ a: ["y"], b: ["x"] });
  });

  it("con cantidad impar, A queda con uno más", () => {
    const { a, b } = snakeDraft(players.slice(0, 5));
    expect(a).toHaveLength(3);
    expect(b).toHaveLength(2);
  });
});

describe("guardar equipos", () => {
  it("exige al menos un jugador por equipo", () => {
    expect(teamsSaveIssue(0, 5)).not.toBeNull();
    expect(teamsSaveIssue(5, 0)).not.toBeNull();
    expect(teamsSaveIssue(4, 5)).toBeNull();
  });

  it("limpia los nombres y usa el de siempre si queda vacío", () => {
    expect(cleanTeamName("  Los   Pibes ", "a")).toBe("Los Pibes");
    expect(cleanTeamName("   ", "b")).toBe("Rojo");
    expect(cleanTeamName("x".repeat(40), "a")).toHaveLength(30);
  });
});
