import { describe, expect, it } from "vitest";
import { recordResultSchema } from "./schemas";

const base = {
  groupId: "00000000-0000-4000-8000-000000000000",
  matchId: "00000000-0000-4000-8000-000000000001",
  scoreA: 2,
  scoreB: 1,
  events: [],
  mvpPlayerId: null,
};

describe("recordResultSchema", () => {
  it("deja las notas vacías como '' para que la RPC las borre", () => {
    expect(recordResultSchema.parse({ ...base, notes: "   " }).notes).toBe("");
  });

  it("sin notas no las toca", () => {
    expect(recordResultSchema.parse(base).notes).toBeUndefined();
  });

  it("limita el largo", () => {
    expect(recordResultSchema.safeParse({ ...base, notes: "x".repeat(501) }).success).toBe(false);
  });
});
