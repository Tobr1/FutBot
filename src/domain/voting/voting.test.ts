import { describe, expect, it } from "vitest";
import {
  changedCount,
  closesInLabel,
  closesSoon,
  hasPendingVotes,
  isValidScore,
  progressPercent,
  ratedProgressLabel,
  ratingsPayload,
  SCORES,
  scoreHint,
  timeLeftLabel,
  voteTargets,
  votersLabel,
  votingPhase,
} from "./voting";

const NOW = Date.parse("2026-10-19T18:00:00Z");
const inMinutes = (minutes: number) => new Date(NOW + minutes * 60_000).toISOString();

describe("votingPhase", () => {
  it("pendiente si el partido no terminó o no tiene cierre", () => {
    expect(votingPhase("scheduled", inMinutes(60), NOW)).toBe("pending");
    expect(votingPhase("finished", null, NOW)).toBe("pending");
    expect(votingPhase("finished", "no-es-fecha", NOW)).toBe("pending");
  });

  it("abierta hasta el cierre y cerrada desde el cierre (incluido)", () => {
    expect(votingPhase("finished", inMinutes(1), NOW)).toBe("open");
    expect(votingPhase("finished", inMinutes(0), NOW)).toBe("closed");
    expect(votingPhase("finished", inMinutes(-90), NOW)).toBe("closed");
  });
});

describe("tiempo restante", () => {
  it.each([
    [0.5, "menos de 1 min"],
    [45, "45 min"],
    [60, "1 h"],
    [5 * 60 + 20, "5 h 20 min"],
    [24 * 60, "1 día"],
    [27 * 60 + 59, "1 día 3 h"],
    [50 * 60, "2 días 2 h"],
  ])("%s min → %s", (minutes, label) => {
    expect(timeLeftLabel(inMinutes(minutes), NOW)).toBe(label);
  });

  it("arma la frase de cierre o avisa que cerró", () => {
    expect(closesInLabel(inMinutes(90), NOW)).toBe("Cierra en 1 h 30 min");
    expect(closesInLabel(inMinutes(-1), NOW)).toBe("Votación cerrada");
    expect(timeLeftLabel(inMinutes(-1), NOW)).toBe("0 min");
  });

  it("marca el cierre cercano", () => {
    expect(closesSoon(inMinutes(120), NOW)).toBe(true);
    expect(closesSoon(inMinutes(5 * 60), NOW)).toBe(false);
    expect(closesSoon(inMinutes(-5), NOW)).toBe(false);
  });
});

describe("progreso", () => {
  it("cuenta calificados y votantes", () => {
    expect(ratedProgressLabel(3, 8)).toBe("3 de 8 calificados");
    expect(ratedProgressLabel(9, 8)).toBe("8 de 8 calificados");
    expect(votersLabel(4, 9)).toBe("4 de 9 ya votaron");
    expect(votersLabel(1, 9)).toBe("1 de 9 ya votó");
    expect(votersLabel(0, 9)).toBe("Todavía no votó nadie (pueden 9)");
    expect(votersLabel(0, 0)).toBe("Nadie con cuenta jugó este partido");
  });

  it("calcula porcentajes acotados", () => {
    expect(progressPercent(1, 3)).toBe(33);
    expect(progressPercent(5, 3)).toBe(100);
    expect(progressPercent(1, 0)).toBe(0);
  });
});

describe("calificaciones", () => {
  it("valida enteros de 1 a 10", () => {
    expect(SCORES).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(isValidScore(1)).toBe(true);
    expect(isValidScore(10)).toBe(true);
    expect(isValidScore(0)).toBe(false);
    expect(isValidScore(7.5)).toBe(false);
    expect(isValidScore("7")).toBe(false);
  });

  it("da una pista por tramo", () => {
    expect(scoreHint(10)).toBe("Crack");
    expect(scoreHint(8)).toBe("Figura");
    expect(scoreHint(7)).toBe("Muy bien");
    expect(scoreHint(6)).toBe("Bien");
    expect(scoreHint(4)).toBe("Regular");
    expect(scoreHint(2)).toBe("Flojo");
  });

  it("arma el envío solo con jugadores habilitados y votos válidos", () => {
    const draft = { a: 7, b: null, c: 11, x: 5, d: 3 };
    expect(ratingsPayload(draft, ["a", "b", "c", "d"])).toEqual([
      { playerId: "a", score: 7 },
      { playerId: "d", score: 3 },
    ]);
  });

  it("cuenta lo nuevo o cambiado respecto de lo enviado", () => {
    expect(changedCount({ a: 7, b: 5, c: 4 }, { a: 7, b: 6 }, ["a", "b", "c"])).toBe(2);
    expect(changedCount({ a: 7 }, { a: 7 }, ["a"])).toBe(0);
  });
});

describe("voteTargets", () => {
  const teams = { a: ["yo", "p1", "p2"], b: ["r1", "r2"] };

  it("separa compañeros y rivales sin incluirse", () => {
    expect(voteTargets(teams, "yo")).toEqual({ mySide: "a", teammates: ["p1", "p2"], rivals: ["r1", "r2"] });
    expect(voteTargets(teams, "r2")).toEqual({ mySide: "b", teammates: ["r1"], rivals: ["yo", "p1", "p2"] });
  });

  it("quien no jugó no califica", () => {
    expect(voteTargets(teams, "otro")).toEqual({ mySide: null, teammates: [], rivals: [] });
    expect(voteTargets(teams, null).mySide).toBeNull();
  });

  it("ignora repetidos", () => {
    expect(voteTargets({ a: ["yo", "p1", "p1"], b: ["p1", "r1"] }, "yo")).toEqual({
      mySide: "a",
      teammates: ["p1"],
      rivals: ["r1"],
    });
  });
});

describe("hasPendingVotes", () => {
  it("pendiente mientras falte calificar a alguien", () => {
    expect(hasPendingVotes({ members: ["yo", "a", "b"], me: "yo", ratedIds: ["a"] })).toBe(true);
    expect(hasPendingVotes({ members: ["yo", "a", "b"], me: "yo", ratedIds: ["a", "b"] })).toBe(false);
  });

  it("sin pendientes si no jugó", () => {
    expect(hasPendingVotes({ members: ["a", "b"], me: "yo", ratedIds: [] })).toBe(false);
  });
});
