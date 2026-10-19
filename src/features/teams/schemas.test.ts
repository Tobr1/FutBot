import { describe, expect, it } from "vitest";
import { teamRuleSchema } from "./schemas";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const G = "33333333-3333-4333-8333-333333333333";

describe("teamRuleSchema", () => {
  it("acepta una regla válida y limpia la nota vacía", () => {
    const parsed = teamRuleSchema.parse({ groupId: G, playerA: A, playerB: B, kind: "apart", note: "  " });
    expect(parsed).toEqual({ groupId: G, playerA: A, playerB: B, kind: "apart", note: null });
  });

  it("exige dos jugadores distintos", () => {
    const result = teamRuleSchema.safeParse({ groupId: G, playerA: A, playerB: A, kind: "together" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]).toMatchObject({ path: ["playerB"], message: "Elegí dos jugadores distintos." });
  });

  it("pide elegir jugadores y tipo", () => {
    const result = teamRuleSchema.safeParse({ groupId: G, playerA: "", playerB: "", kind: "" });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toEqual(expect.arrayContaining(["playerA", "playerB", "kind"]));
  });

  it("limita la nota a 120 caracteres", () => {
    const result = teamRuleSchema.safeParse({ groupId: G, playerA: A, playerB: B, kind: "together", note: "x".repeat(121) });
    expect(result.success).toBe(false);
  });
});
