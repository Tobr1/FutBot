import { describe, expect, it } from "vitest";
import { CLAIM_SCORE, rankClaimCandidates } from "./claim-candidates";

const players = [
  { id: "a", nickname: "Juanchi", fullName: "Juan Pérez" },
  { id: "b", nickname: "Tito", fullName: null },
  { id: "c", nickname: "Seba", fullName: "Sebastián Gómez" },
  { id: "d", nickname: "El Ruso", fullName: "Martín Ñúñez" },
];

describe("rankClaimCandidates", () => {
  it("puntúa la coincidencia exacta de palabras sumando por palabra", () => {
    const [first] = rankClaimCandidates("Juan Pérez", players);
    expect(first).toEqual({ id: "a", score: CLAIM_SCORE.exact * 2 });
  });

  it("ignora acentos, mayúsculas y signos", () => {
    expect(rankClaimCandidates("SEBASTIAN gomez", players)[0]).toEqual({ id: "c", score: 6 });
    expect(rankClaimCandidates("martin nunez", players)[0]).toEqual({ id: "d", score: 6 });
    expect(rankClaimCandidates("tito!!", players)).toEqual([{ id: "b", score: 3 }]);
  });

  it("cuenta prefijos de 3 o más letras en cualquier dirección", () => {
    // "juan" es prefijo de "juanchi" (y además coincide exacto con el nombre completo)
    expect(rankClaimCandidates("Juan", players)).toEqual([{ id: "a", score: 3 }]);
    // "sebastian" empieza con "seba"
    expect(rankClaimCandidates("Sebas", players)).toEqual([{ id: "c", score: 2 }]);
    // 2 letras no alcanzan
    expect(rankClaimCandidates("Ju", players)).toEqual([]);
  });

  it("da 1 punto a una inicial suelta", () => {
    expect(rankClaimCandidates("M.", players)).toEqual([{ id: "d", score: 1 }]);
    expect(rankClaimCandidates("J. Pérez", players)).toEqual([{ id: "a", score: 4 }]);
  });

  it("no cuenta conectores como 'de' o 'el'", () => {
    expect(rankClaimCandidates("Pedro de la Fuente", [{ id: "x", nickname: "El de la esquina", fullName: null }])).toEqual(
      [],
    );
  });

  it("ordena de mayor a menor y conserva el orden en los empates", () => {
    const ranked = rankClaimCandidates("Juan Sebastián", [
      { id: "1", nickname: "Juancito", fullName: null },
      { id: "2", nickname: "Juan", fullName: "Juan Sebastián Díaz" },
      { id: "3", nickname: "Sebastián", fullName: null },
    ]);
    expect(ranked).toEqual([
      { id: "2", score: 6 },
      { id: "3", score: 3 },
      { id: "1", score: 2 },
    ]);

    const tied = rankClaimCandidates("Tito", [
      { id: "z", nickname: "Tito", fullName: null },
      { id: "y", nickname: "Tito", fullName: "Tito Gómez" },
    ]);
    expect(tied.map((c) => c.id)).toEqual(["z", "y"]);
  });

  it("devuelve vacío sin coincidencias o con un nombre vacío", () => {
    expect(rankClaimCandidates("Lionel", players)).toEqual([]);
    expect(rankClaimCandidates("", players)).toEqual([]);
    expect(rankClaimCandidates("   ", players)).toEqual([]);
    expect(rankClaimCandidates("Juan", [])).toEqual([]);
  });
});
