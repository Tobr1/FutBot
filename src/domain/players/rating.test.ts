import { describe, expect, it } from "vitest";
import { overall, ratingTier } from "./rating";

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
});

describe("overall", () => {
  it("convierte 1-10 a 10-99", () => {
    expect(overall(7.44)).toBe(74);
    expect(overall(10)).toBe(99);
    expect(overall(0.2)).toBe(10);
  });
});
