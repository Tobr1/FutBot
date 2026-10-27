import { describe, expect, it } from "vitest";
import { isPlayerSortKey, PLAYER_SORT_KEYS, sortPlayers, topByRating, type SortablePlayer } from "./sort";

const player = (nickname: string, rating: number, matches = 0, goals = 0): SortablePlayer & { id: string } => ({
  id: nickname.toLowerCase(),
  nickname,
  rating,
  stats: { matches, goals },
});

const squad = [
  player("Tano", 6, 10, 4),
  player("Ángel", 8, 3, 7),
  player("beto", 6, 12, 4),
  player("Zurdo", 4.5, 12, 0),
  player("Chino", 7.5, 0, 0),
];

const names = (list: readonly SortablePlayer[]) => list.map((p) => p.nickname);

describe("PLAYER_SORT_KEYS", () => {
  it("lista los criterios disponibles", () => {
    expect(PLAYER_SORT_KEYS).toEqual(["rating", "matches", "goals", "name"]);
  });

  it("isPlayerSortKey valida valores externos", () => {
    expect(isPlayerSortKey("goals")).toBe(true);
    expect(isPlayerSortKey("mvp")).toBe(false);
    expect(isPlayerSortKey(undefined)).toBe(false);
  });
});

describe("sortPlayers", () => {
  it("ordena por valoración de mayor a menor con desempate por apodo", () => {
    expect(names(sortPlayers(squad, "rating"))).toEqual(["Ángel", "Chino", "beto", "Tano", "Zurdo"]);
  });

  it("ordena por partidos y goles de mayor a menor", () => {
    expect(names(sortPlayers(squad, "matches"))).toEqual(["beto", "Zurdo", "Tano", "Ángel", "Chino"]);
    expect(names(sortPlayers(squad, "goals"))).toEqual(["Ángel", "beto", "Tano", "Chino", "Zurdo"]);
  });

  it("ordena por nombre A-Z respetando acentos y mayúsculas (es-AR)", () => {
    expect(names(sortPlayers(squad, "name"))).toEqual(["Ángel", "beto", "Chino", "Tano", "Zurdo"]);
  });

  it("no modifica el arreglo original y conserva el tipo", () => {
    const before = names(squad);
    const sorted = sortPlayers(squad, "goals");
    expect(names(squad)).toEqual(before);
    expect(sorted).not.toBe(squad);
    expect(sorted[0].id).toBe("ángel");
  });

  it("acepta un plantel vacío", () => {
    expect(sortPlayers([], "rating")).toEqual([]);
  });
});

describe("topByRating", () => {
  it("devuelve los n mejores por valoración", () => {
    expect(names(topByRating(squad, 3))).toEqual(["Ángel", "Chino", "beto"]);
  });

  it("devuelve todos si n supera el plantel", () => {
    expect(topByRating(squad, 10)).toHaveLength(squad.length);
  });

  it("devuelve vacío para n no positivo", () => {
    expect(topByRating(squad, 0)).toEqual([]);
    expect(topByRating(squad, -2)).toEqual([]);
  });
});
