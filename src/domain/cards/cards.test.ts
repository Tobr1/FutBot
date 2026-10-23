import { describe, expect, it } from "vitest";
import { attributeKindFor, buildCard, cardOverall, cardTier, isElite } from "./cards";

describe("cardOverall", () => {
  it("pondera según la posición", () => {
    const values = [52, 38, 46, 48, 50, 55]; // RIT TIR PAS REG DEF FIS
    // DEF: .1*52 + .05*38 + .15*46 + .05*48 + .35*50 + .3*55 = 50.4
    expect(cardOverall(values, "defender")).toBe(50);
    // DEL: .15*52 + .3*38 + .15*46 + .2*48 + .05*50 + .15*55 = 46.45
    expect(cardOverall(values, "forward")).toBe(46);
    // MED: .1*52 + .1*38 + .3*46 + .2*48 + .15*50 + .15*55 = 48.15
    expect(cardOverall(values, "midfielder")).toBe(48);
  });

  it("sin posición usa el promedio simple; el arquero, sus propios pesos", () => {
    expect(cardOverall([60, 60, 60, 60, 60, 66], null)).toBe(61);
    expect(cardOverall([80, 80, 80, 80, 80, 80], "goalkeeper")).toBe(80);
  });

  it("valores inválidos no rompen", () => {
    expect(cardOverall([1, 2, 3], "forward")).toBe(0);
  });
});

describe("niveles y élite", () => {
  it("bronce hasta 59, plata de 60 a 74, oro desde 75", () => {
    expect(cardTier(59)).toBe("bronze");
    expect(cardTier(60)).toBe("silver");
    expect(cardTier(74)).toBe("silver");
    expect(cardTier(75)).toBe("gold");
  });

  it("élite desde 10 MVP", () => {
    expect(isElite(9)).toBe(false);
    expect(isElite(10)).toBe(true);
  });

  it("el arquero tiene atributos propios", () => {
    expect(attributeKindFor("goalkeeper")).toBe("goalkeeper");
    expect(attributeKindFor("defender")).toBe("field");
    expect(attributeKindFor(null)).toBe("field");
  });
});

describe("buildCard", () => {
  const attrs = { kind: "field" as const, values: [80.4, 70, 75, 72, 60, 70], hasSelf: true, validators: 3, updatedAt: null };

  it("con atributos y 3 validaciones no es provisional", () => {
    const card = buildCard({ attributes: attrs, position: "midfielder", mvps: 2, formOverall: 55 });
    expect(card.source).toBe("attributes");
    expect(card.provisional).toBe(false);
    expect(card.attributes?.values[0]).toBe(80);
    expect(card.tier).toBe("silver");
  });

  it("con menos de 3 validaciones es provisional", () => {
    expect(buildCard({ attributes: { ...attrs, validators: 2 }, position: "forward", mvps: 0, formOverall: 50 }).provisional).toBe(true);
  });

  it("10 MVP la hacen élite sin cambiar la media", () => {
    const normal = buildCard({ attributes: attrs, position: "midfielder", mvps: 9, formOverall: 55 });
    const elite = buildCard({ attributes: attrs, position: "midfielder", mvps: 10, formOverall: 55 });
    expect(elite.elite).toBe(true);
    expect(elite.overall).toBe(normal.overall);
  });

  it("sin atributos usa la forma de los partidos, provisional", () => {
    const card = buildCard({ attributes: null, position: "defender", mvps: 0, formOverall: 78 });
    expect(card).toMatchObject({ source: "form", overall: 78, tier: "gold", provisional: true, attributes: null });
  });

  it("atributos de otro tipo (cambió de posición) no se usan", () => {
    const card = buildCard({ attributes: attrs, position: "goalkeeper", mvps: 0, formOverall: 50 });
    expect(card.source).toBe("form");
  });
});
