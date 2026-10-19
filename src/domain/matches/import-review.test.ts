import { describe, expect, it } from "vitest";
import { matchLineup, parseLineup } from "@/domain/lineup-import";
import { initialReview, type ReviewRow, resolveReview, reviewIssues, reviewProgress } from "./import-review";

const ROSTER = [
  { id: "p1", nickname: "Juanchi", fullName: "Juan Cruz Pérez" },
  { id: "p2", nickname: "Manu" },
  { id: "p3", nickname: "Vece", aliases: ["Vecellio"] },
  { id: "p4", nickname: "Toto" },
  { id: "p5", nickname: "Tota" },
];

function review(text: string): ReviewRow[] {
  return initialReview(matchLineup(parseLineup(text).entries, ROSTER));
}

const decide = (rows: ReviewRow[], name: string, decision: ReviewRow["decision"]) =>
  rows.map((row) => (row.name === name ? { ...row, decision } : row));

describe("initialReview", () => {
  it("deja elegidas las coincidencias seguras y pendiente lo demás", () => {
    const rows = review("1. Manu\n2. Tot\n3. Ramiro");
    expect(rows.map((r) => [r.name, r.suggestion, r.decision.kind])).toEqual([
      ["Manu", "matched", "existing"],
      ["Tot", "ambiguous", "pending"],
      ["Ramiro", "new", "pending"],
    ]);
    expect(reviewProgress(rows)).toEqual({ pending: 2, existing: 1, created: 0, ignored: 0 });
  });
});

describe("reviewIssues", () => {
  it("no deja elegir dos veces al mismo jugador", () => {
    let rows = review("1. Manu\n2. Manuel");
    rows = decide(rows, "Manuel", { kind: "existing", playerId: "p2" });
    const issues = reviewIssues(rows, ROSTER);
    expect(issues.size).toBe(1);
    expect([...issues.values()][0]).toContain("Manu");
  });

  it("no deja crear una ficha con un apodo que ya existe", () => {
    let rows = review("1. Ramiro");
    rows = decide(rows, "Ramiro", { kind: "new", nickname: "toto" });
    expect([...reviewIssues(rows, ROSTER).values()][0]).toContain("Toto");
  });

  it("detecta fichas nuevas repetidas y apodos vacíos", () => {
    let rows = review("1. Ramiro\n2. Rami\n3. Pepe");
    rows = decide(rows, "Ramiro", { kind: "new", nickname: "Rami" });
    rows = decide(rows, "Rami", { kind: "new", nickname: "rami" });
    rows = decide(rows, "Pepe", { kind: "new", nickname: "  " });
    expect(reviewIssues(rows, ROSTER).size).toBe(2);
  });
});

describe("resolveReview", () => {
  it("arma la convocatoria con titulares, suplentes, fichas nuevas e ignorados", () => {
    let rows = review("Lista\n1. Manu\n2. Tot\n3. Ramiro\nSuplentes:\n1. Juan\n2. Pepe");
    rows = decide(rows, "Tot", { kind: "existing", playerId: "p4" });
    rows = decide(rows, "Ramiro", { kind: "new", nickname: "Rami" });
    rows = decide(rows, "Pepe", { kind: "ignore" });
    const { entries } = resolveReview(rows, ROSTER);
    expect(entries).toEqual([
      { kind: "player", playerId: "p2", status: "confirmed" },
      { kind: "player", playerId: "p4", status: "confirmed" },
      { kind: "new", nickname: "Rami", status: "confirmed" },
      { kind: "player", playerId: "p1", status: "reserve" },
    ]);
  });

  it("recuerda como alias solo lo que confirmó el admin", () => {
    let rows = review("1. Tot\n2. Manu\n3. Vecellio");
    rows = decide(rows, "Tot", { kind: "existing", playerId: "p4" });
    const { aliases } = resolveReview(rows, ROSTER);
    expect(aliases).toEqual([{ playerId: "p4", alias: "Tot" }]);
  });

  it("no guarda alias que ya son el apodo de otro o el nombre completo", () => {
    const rows: ReviewRow[] = [
      { key: "1", name: "Tota", section: "confirmed", suggestion: "ambiguous", candidates: [], decision: { kind: "existing", playerId: "p4" } },
      {
        key: "2",
        name: "Juan Cruz Pérez",
        section: "confirmed",
        suggestion: "ambiguous",
        candidates: [],
        decision: { kind: "existing", playerId: "p1" },
      },
    ];
    expect(resolveReview(rows, ROSTER).aliases).toEqual([]);
  });
});
