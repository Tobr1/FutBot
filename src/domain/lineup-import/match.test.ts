import { describe, expect, it } from "vitest";
import { AUTO_MATCH_SCORE, damerauLevenshtein, matchLineup, similarity, summarize, type RosterPlayer } from "./match";
import { parseLineup, type ParsedEntry } from "./parse";

const README_LIST =
  "Sábado 22 hs\n\n1. Brito\n2. Manu\n3. Vece\n4. Paramo\n5. Tadeo\n6. Fran\n7. Boni\n8. Matías\n9. Gero\n10. Juanchi\n11. Lucas\n12. Nacho";

const roster: RosterPlayer[] = [
  { id: "brito", nickname: "Brito", fullName: "Agustín Brito" },
  { id: "manu", nickname: "Manu", fullName: "Manuel Gómez" },
  { id: "vece", nickname: "Vece", fullName: null },
  { id: "paramo", nickname: "Páramo", fullName: "Ezequiel Páramo" },
  { id: "tadeo", nickname: "Tadeo" },
  { id: "fran", nickname: "Fran", fullName: "Francisco Ruiz" },
  { id: "boni", nickname: "Boni", fullName: "Bonifacio Díaz" },
  { id: "matias", nickname: "Matías", fullName: "Matías López" },
  { id: "gero", nickname: "Gero", fullName: "Gerónimo Paz" },
  { id: "juanchi", nickname: "Juanchi", fullName: "Juan Pérez", aliases: ["Juan Cruz"] },
  { id: "lucas", nickname: "Lucas", fullName: "Lucas Romero" },
  { id: "nacho", nickname: "Nacho", fullName: "Ignacio Sosa" },
];

function entries(...names: string[]): ParsedEntry[] {
  return names.map((name, i) => ({ raw: name, name, order: i + 1, section: "confirmed", positionHint: null }));
}

function matchOne(name: string, players: RosterPlayer[] = roster) {
  return matchLineup(entries(name), players)[0];
}

describe("damerauLevenshtein / similarity", () => {
  it("cuenta ediciones y transposiciones", () => {
    expect(damerauLevenshtein("", "")).toBe(0);
    expect(damerauLevenshtein("abc", "")).toBe(3);
    expect(damerauLevenshtein("paramo", "paramos")).toBe(1);
    expect(damerauLevenshtein("boni", "bnoi")).toBe(1);
    expect(damerauLevenshtein("kitten", "sitting")).toBe(3);
    expect(damerauLevenshtein("ca", "abc")).toBe(3);
  });

  it("devuelve similitud entre 0 y 1", () => {
    expect(similarity("gero", "gero")).toBe(1);
    expect(similarity("", "")).toBe(1);
    expect(similarity("abcd", "wxyz")).toBe(0);
    expect(similarity("paramo", "paramos")).toBeCloseTo(6 / 7);
  });
});

describe("matchLineup", () => {
  it("resuelve toda la lista del README contra el plantel", () => {
    const parsed = parseLineup(README_LIST);
    const result = matchLineup(parsed.entries, roster);
    expect(result.map((e) => e.status)).toEqual(Array(12).fill("matched"));
    expect(result.map((e) => e.playerId)).toEqual(roster.map((p) => p.id));
    expect(result[3]).toMatchObject({ name: "Paramo", order: 4, section: "confirmed", playerId: "paramo" });
    expect(summarize(result)).toEqual({ matched: 12, ambiguous: 0, new: 0, reserve: 0 });
  });

  it("ignora mayúsculas y acentos en la coincidencia exacta", () => {
    const result = matchOne("MATIAS");
    expect(result.status).toBe("matched");
    expect(result.playerId).toBe("matias");
    expect(result.candidates[0]).toMatchObject({ id: "matias", score: 1, reason: "exact" });
    expect(matchOne("páramo").playerId).toBe("paramo");
  });

  it("usa los alias guardados", () => {
    const result = matchOne("juan cruz");
    expect(result).toMatchObject({ status: "matched", playerId: "juanchi" });
    expect(result.candidates[0]).toMatchObject({ id: "juanchi", nickname: "Juanchi", score: 1, reason: "alias" });
  });

  it("usa el nombre completo y el primer nombre si es único", () => {
    expect(matchOne("Juan Pérez")).toMatchObject({ status: "matched", playerId: "juanchi" });
    expect(matchOne("Juan Pérez").candidates[0].reason).toBe("full_name");
    const ignacio = matchOne("Ignacio");
    expect(ignacio).toMatchObject({ status: "matched", playerId: "nacho" });
    expect(ignacio.candidates[0]).toMatchObject({ reason: "full_name", score: 0.95 });
  });

  it("sugiere (sin resolver) por apellido o palabra del apodo", () => {
    const perez = matchOne("Perez");
    expect(perez).toMatchObject({ status: "ambiguous", playerId: null });
    expect(perez.candidates[0]).toMatchObject({ id: "juanchi", reason: "full_name", score: 0.85 });
    const ruso = matchOne("Ruso", [{ id: "r", nickname: "El Ruso" }]);
    expect(ruso).toMatchObject({ status: "ambiguous", playerId: null });
  });

  it("no resuelve por primer nombre si lo comparten dos fichas", () => {
    const players: RosterPlayer[] = [
      { id: "a", nickname: "Juanchi", fullName: "Juan Pérez" },
      { id: "b", nickname: "Tano", fullName: "Juan Rossi" },
    ];
    const result = matchOne("Juan", players);
    expect(result.status).toBe("ambiguous");
    expect(result.playerId).toBeNull();
    expect(result.candidates.map((c) => c.id).sort()).toEqual(["a", "b"]);
  });

  it("pide confirmación ante un parecido (typo)", () => {
    const result = matchOne("Paramos");
    expect(result.status).toBe("ambiguous");
    expect(result.playerId).toBeNull();
    expect(result.candidates[0].id).toBe("paramo");
    expect(["prefix", "fuzzy"]).toContain(result.candidates[0].reason);
    expect(result.candidates[0].score).toBeLessThan(AUTO_MATCH_SCORE);
  });

  it("detecta transposiciones como candidatos", () => {
    const result = matchOne("Bnoi");
    expect(result).toMatchObject({ status: "ambiguous", playerId: null });
    expect(result.candidates[0]).toMatchObject({ id: "boni", reason: "fuzzy" });
  });

  it("sugiere por prefijo de 3 o más letras", () => {
    const result = matchOne("Gerón");
    expect(result.status).toBe("ambiguous");
    expect(result.candidates[0]).toMatchObject({ id: "gero", reason: "prefix" });
    expect(matchOne("Ge").status).toBe("new");
  });

  it("marca como nuevo lo que no se parece a nadie", () => {
    const result = matchOne("Zapata");
    expect(result).toMatchObject({ status: "new", playerId: null, candidates: [] });
  });

  it("resuelve sin confirmación un parecido muy alto y único", () => {
    const players: RosterPlayer[] = [{ id: "x", nickname: "Maximiliano Ortega" }];
    const result = matchOne("Maximiliano Ortegaa", players);
    expect(result.candidates[0].score).toBeGreaterThanOrEqual(AUTO_MATCH_SCORE);
    expect(result).toMatchObject({ status: "matched", playerId: "x" });
  });

  it("no resuelve un parecido alto si hay otro candidato", () => {
    const players: RosterPlayer[] = [
      { id: "x", nickname: "Maximiliano Ortega" },
      { id: "y", nickname: "Maximiliano" },
    ];
    expect(matchOne("Maximiliano Ortegaa", players).status).toBe("ambiguous");
  });

  it("asigna cada ficha una sola vez", () => {
    const result = matchLineup(entries("Juanchi", "Juan Cruz", "Brito"), roster);
    expect(result.map((e) => [e.status, e.playerId])).toEqual([
      ["matched", "juanchi"],
      ["ambiguous", null],
      ["matched", "brito"],
    ]);
    expect(result[1].candidates[0].id).toBe("juanchi");
  });

  it("prioriza las coincidencias exactas sobre las del primer nombre", () => {
    // "Ignacio" llega antes, pero "Nacho" es exacto y se queda con la ficha.
    const result = matchLineup(entries("Ignacio", "Nacho"), roster);
    expect(result.map((e) => [e.status, e.playerId])).toEqual([
      ["ambiguous", null],
      ["matched", "nacho"],
    ]);
  });

  it("es ambiguo si dos fichas coinciden exacto (apodo de una, alias de otra)", () => {
    const players: RosterPlayer[] = [
      { id: "a", nickname: "Fran" },
      { id: "b", nickname: "Pancho", aliases: ["Fran"] },
    ];
    const result = matchOne("Fran", players);
    expect(result.status).toBe("ambiguous");
    expect(result.candidates.map((c) => c.reason)).toEqual(["exact", "alias"]);
  });

  it("permite fichas inactivas pero las ordena después de las activas", () => {
    const players: RosterPlayer[] = [
      { id: "old", nickname: "Lucho", isActive: false },
      { id: "new", nickname: "Lucha" },
    ];
    expect(matchOne("Lucho", players)).toMatchObject({ status: "matched", playerId: "old" });
    const fuzzy = matchOne("Luchi", players);
    expect(fuzzy.status).toBe("ambiguous");
    expect(fuzzy.candidates.map((c) => c.id)).toEqual(["new", "old"]);
  });

  it("conserva los datos de la entrada", () => {
    const parsed = parseLineup("1. Brito (arq)\nSuplentes:\nZapata");
    const result = matchLineup(parsed.entries, roster);
    expect(result[0]).toMatchObject({ raw: "1. Brito (arq)", name: "Brito", positionHint: "goalkeeper", status: "matched" });
    expect(result[1]).toMatchObject({ name: "Zapata", section: "reserve", status: "new" });
    expect(summarize(result)).toEqual({ matched: 1, ambiguous: 0, new: 1, reserve: 1 });
  });

  it("procesa una lista real de punta a punta", () => {
    const text = [
      "[16/10 21:03] Brito: Fútbol jueves 21:30 - La Canchita",
      "1️⃣ Brito (arq) ✅",
      "2️⃣ Manu",
      "3️⃣ Paramos",
      "4️⃣ ~Vece~",
      "5️⃣ Juan Cruz",
      "6️⃣ Juanchi",
      "7️⃣",
      "8️⃣ Zapata",
      "9️⃣ manu",
      "Suplentes:",
      "- Matias",
      "- Ignacio",
    ].join("\n");
    const parsed = parseLineup(text);
    expect(parsed.header).toMatchObject({ dayHint: "jueves", timeHint: "21:30" });
    expect(parsed.ignored).toEqual(["4️⃣ ~Vece~", "7️⃣", "9️⃣ manu"]);
    const result = matchLineup(parsed.entries, roster);
    expect(result.map((e) => [e.name, e.status, e.playerId])).toEqual([
      ["Brito", "matched", "brito"],
      ["Manu", "matched", "manu"],
      ["Paramos", "ambiguous", null],
      ["Juan Cruz", "matched", "juanchi"],
      ["Juanchi", "ambiguous", null],
      ["Zapata", "new", null],
      ["Matias", "matched", "matias"],
      ["Ignacio", "matched", "nacho"],
    ]);
    expect(summarize(result)).toEqual({ matched: 5, ambiguous: 2, new: 1, reserve: 2 });
  });

  it("devuelve candidatos vacíos con plantel vacío", () => {
    expect(matchLineup(entries("Brito"), [])[0]).toMatchObject({ status: "new", candidates: [] });
    expect(matchLineup([], roster)).toEqual([]);
  });
});
