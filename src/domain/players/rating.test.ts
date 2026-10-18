import { describe, expect, it } from "vitest";
import { clampRating, overall, RATING_MAX, RATING_MIN, RATING_STEP, ratingTier, stepRating, TIER_THRESHOLDS } from "./rating";

describe("ratingTier", () => {
  it.each([
    [3.2, "promesa"],
    [5, "titular"],
    [6.49, "titular"],
    [6.5, "figura"],
    [8, "crack"],
    [10, "crack"],
  ] as const)("%d → %s", (rating, tier) => {
    expect(ratingTier(rating)).toBe(tier);
  });

  it("usa TIER_THRESHOLDS como límites inferiores", () => {
    expect(TIER_THRESHOLDS).toEqual({ titular: 5, figura: 6.5, crack: 8 });
    expect(ratingTier(TIER_THRESHOLDS.titular)).toBe("titular");
    expect(ratingTier(TIER_THRESHOLDS.titular - 0.01)).toBe("promesa");
    expect(ratingTier(TIER_THRESHOLDS.figura)).toBe("figura");
    expect(ratingTier(TIER_THRESHOLDS.figura - 0.01)).toBe("titular");
    expect(ratingTier(TIER_THRESHOLDS.crack)).toBe("crack");
    expect(ratingTier(TIER_THRESHOLDS.crack - 0.01)).toBe("figura");
  });
});

describe("overall", () => {
  it("convierte 1-10 a 10-99", () => {
    expect(overall(7.44)).toBe(74);
    expect(overall(10)).toBe(99);
    expect(overall(0.2)).toBe(10);
  });
});

describe("constantes de escala", () => {
  it("expone el rango 1-10 con paso 0,5", () => {
    expect(RATING_MIN).toBe(1);
    expect(RATING_MAX).toBe(10);
    expect(RATING_STEP).toBe(0.5);
  });
});

describe("clampRating", () => {
  it.each([
    [5, 5],
    [7.3, 7.3],
    [0, 1],
    [-4, 1],
    [10, 10],
    [12.5, 10],
  ])("%d → %d", (input, expected) => {
    expect(clampRating(input)).toBe(expected);
  });

  it("devuelve el mínimo para valores no numéricos", () => {
    expect(clampRating(Number.NaN)).toBe(RATING_MIN);
    expect(clampRating(Number.POSITIVE_INFINITY)).toBe(RATING_MIN);
  });
});

describe("stepRating", () => {
  it("sube y baja de a 0,5 sobre la grilla", () => {
    expect(stepRating(5, 1)).toBe(5.5);
    expect(stepRating(5, -1)).toBe(4.5);
    expect(stepRating(7.5, 1)).toBe(8);
    expect(stepRating(7.5, -1)).toBe(7);
  });

  it("ajusta valores fuera de la grilla al múltiplo siguiente en esa dirección", () => {
    expect(stepRating(7.3, 1)).toBe(7.5);
    expect(stepRating(7.3, -1)).toBe(7);
    expect(stepRating(6.75, 1)).toBe(7);
    expect(stepRating(6.75, -1)).toBe(6.5);
  });

  it("no sale del rango 1-10", () => {
    expect(stepRating(10, 1)).toBe(10);
    expect(stepRating(9.8, 1)).toBe(10);
    expect(stepRating(1, -1)).toBe(1);
    expect(stepRating(1.2, -1)).toBe(1);
    expect(stepRating(14, -1)).toBe(9.5);
    expect(stepRating(-3, 1)).toBe(1.5);
  });

  it("tolera errores de coma flotante", () => {
    expect(stepRating(0.1 + 0.2 + 6.7, 1)).toBe(7.5);
    expect(stepRating(7.000000000000001, -1)).toBe(6.5);
  });
});
