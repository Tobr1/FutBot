import { describe, expect, it } from "vitest";
import { balanceTeams } from "./balance";
import { evaluateSplit } from "./cost";
import { bruteForce, partitionKey, randomPlayers, splitDistance } from "./test-utils";
import type { BalanceResult, BalancerPlayer, Constraints } from "./types";

const binom = (n: number, k: number): number => (k === 0 ? 1 : (binom(n - 1, k - 1) * n) / k);

function expectHonors(result: BalanceResult, constraints: Constraints) {
  expect(result.alternatives.length).toBeGreaterThan(0);
  for (const alt of result.alternatives) {
    const side = (id: string) => (alt.a.includes(id) ? "a" : "b");
    for (const [id, s] of Object.entries(constraints.pinned ?? {})) expect(side(id)).toBe(s);
    for (const [x, y] of constraints.together ?? []) expect(side(x)).toBe(side(y));
    for (const [x, y] of constraints.apart ?? []) expect(side(x)).not.toBe(side(y));
  }
}

function expectValidSizes(result: BalanceResult, n: number) {
  for (const alt of result.alternatives) {
    expect(alt.a.length + alt.b.length).toBe(n);
    expect(new Set([...alt.a, ...alt.b]).size).toBe(n);
    expect(Math.abs(alt.a.length - alt.b.length)).toBeLessThanOrEqual(1);
  }
}

describe("balanceTeams · búsqueda exhaustiva", () => {
  it.each([6, 7, 8, 9, 10, 11, 12])("encuentra el óptimo y las mejores alternativas como la fuerza bruta (n = %i)", (n) => {
    for (const seed of [1, 2, 3]) {
      const players = randomPlayers(n, seed * 100 + n);
      const options = { previousTeams: { a: ["p0", "p2", "p4"], b: ["p1", "p3"] } };
      const result = balanceTeams(players, {}, { ...options, minDiff: 1 });
      const brute = bruteForce(players, {}, options);
      expect(result.method).toBe("exhaustive");
      expect(result.violations).toEqual([]);
      expect(result.alternatives).toHaveLength(5);
      result.alternatives.forEach((alt, k) => {
        expect(alt.cost).toBeCloseTo(brute[k].cost, 9);
        expect(evaluateSplit(players, alt.a, alt.b, options).cost).toBeCloseTo(alt.cost, 9);
      });
      expectValidSizes(result, n);
    }
  });

  it("evalúa cada partición una sola vez (sin espejos)", () => {
    const even = balanceTeams(randomPlayers(12, 7));
    expect(even.evaluated).toBe(binom(11, 5));
    expect(even.evaluated).toBe(binom(12, 6) / 2);
    const odd = balanceTeams(randomPlayers(11, 7));
    expect(odd.evaluated).toBe(binom(10, 4) + binom(10, 5));
    expect(odd.evaluated).toBe(binom(11, 5));
  });

  it("no devuelve la misma partición dos veces ni su espejo", () => {
    const result = balanceTeams(randomPlayers(10, 3), {}, { topK: 20, minDiff: 1 });
    const keys = result.alternatives.map((alt) => partitionKey(alt.a, alt.b));
    expect(new Set(keys).size).toBe(keys.length);
    // Sin fijados, el equipo A es el del primer jugador.
    for (const alt of result.alternatives) expect(alt.a).toContain("p0");
  });

  it("ordena las alternativas de menor a mayor costo", () => {
    const { alternatives } = balanceTeams(randomPlayers(14, 5));
    for (let k = 1; k < alternatives.length; k++) expect(alternatives[k].cost).toBeGreaterThanOrEqual(alternatives[k - 1].cost);
  });

  it("las alternativas difieren en al menos minDiff jugadores", () => {
    for (const minDiff of [2, 3, 4]) {
      const { alternatives } = balanceTeams(randomPlayers(11, 9), {}, { minDiff, topK: 6 });
      expect(alternatives).toHaveLength(6);
      for (let x = 0; x < alternatives.length; x++) {
        for (let y = x + 1; y < alternatives.length; y++) {
          expect(splitDistance(alternatives[x], alternatives[y])).toBeGreaterThanOrEqual(minDiff);
        }
      }
    }
  });

  it("con cantidad impar arma equipos de n/2 redondeado y el corto recibe mejores jugadores", () => {
    // Total 44: el óptimo es 22 contra 22, con el equipo de 4 promediando 5,5 y el de 5, 4,4.
    const players: BalancerPlayer[] = [9, 8, 5, 4, 4, 4, 4, 3, 3].map((skill, i) => ({
      id: `p${i}`,
      name: `J${i}`,
      skill,
      primary: null,
    }));
    const [best] = balanceTeams(players).alternatives;
    const short = best.a.length < best.b.length ? "a" : "b";
    expect(Math.min(best.a.length, best.b.length)).toBe(4);
    expect(best.metrics.levelDiff).toBeCloseTo(0, 9);
    expect(best.metrics.sumA).toBeCloseTo(best.metrics.sumB, 9);
    const avg = short === "a" ? [best.metrics.avgA, best.metrics.avgB] : [best.metrics.avgB, best.metrics.avgA];
    expect(avg[0]).toBeGreaterThan(avg[1]);
  });

  it("separa a los arqueros cuando hay dos", () => {
    for (const seed of [11, 12, 13, 14]) {
      const result = balanceTeams(randomPlayers(14, seed, { goalkeepers: 2 }));
      for (const alt of result.alternatives) {
        expect(alt.metrics.gkA).toBe(1);
        expect(alt.metrics.gkB).toBe(1);
      }
    }
  });

  it("reparte a los jugadores nuevos", () => {
    const players: BalancerPlayer[] = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      name: `J${i}`,
      skill: 5,
      sigma: i < 2 ? 2.5 : 0.5,
      primary: null,
    }));
    const [best] = balanceTeams(players).alternatives;
    expect(best.a.includes("p0")).not.toBe(best.a.includes("p1"));
  });

  it("respeta fijados, juntos y separados y sigue siendo óptimo", () => {
    const players = randomPlayers(12, 21);
    const constraints: Constraints = {
      pinned: { p3: "b", p7: "a" },
      together: [
        ["p0", "p5"],
        ["p8", "p9"],
      ],
      apart: [
        ["p1", "p2"],
        ["p5", "p10"],
      ],
    };
    const result = balanceTeams(players, constraints, { minDiff: 1 });
    expectHonors(result, constraints);
    const brute = bruteForce(players, constraints);
    result.alternatives.forEach((alt, k) => expect(alt.cost).toBeCloseTo(brute[k].cost, 9));
  });

  it("un fijado en B se respeta aunque sea el primer jugador", () => {
    const constraints: Constraints = { pinned: { p0: "b", p1: "b" } };
    expectHonors(balanceTeams(randomPlayers(8, 4), constraints), constraints);
  });

  it("una restricción puede ganarle a la regla de arqueros", () => {
    const constraints: Constraints = { together: [["p0", "p1"]] };
    const result = balanceTeams(randomPlayers(10, 6, { goalkeepers: 2 }), constraints);
    expectHonors(result, constraints);
    expect(result.alternatives[0].metrics.gkA + result.alternatives[0].metrics.gkB).toBe(2);
  });

  it("procesa 22 jugadores con búsqueda exhaustiva en tiempo razonable", () => {
    const players = randomPlayers(22, 2022);
    const start = performance.now();
    const result = balanceTeams(players, {}, { previousTeams: { a: ["p0", "p1"], b: ["p2", "p3"] } });
    const elapsed = performance.now() - start;
    expect(result.method).toBe("exhaustive");
    expect(result.evaluated).toBe(binom(21, 10));
    expect(result.alternatives).toHaveLength(5);
    expect(elapsed).toBeLessThan(3000);
  });

  it("procesa 21 jugadores con restricciones", () => {
    const constraints: Constraints = { pinned: { p4: "a" }, apart: [["p0", "p1"]], together: [["p2", "p3"]] };
    const result = balanceTeams(randomPlayers(21, 77), constraints);
    expect(result.method).toBe("exhaustive");
    expectHonors(result, constraints);
    expectValidSizes(result, 21);
  });
});

describe("balanceTeams · heurística", () => {
  it("queda muy cerca del óptimo exhaustivo con 20 jugadores", () => {
    for (const seed of [31, 32, 33]) {
      const players = randomPlayers(20, seed);
      const exact = balanceTeams(players);
      const heuristic = balanceTeams(players, {}, { exhaustiveLimit: 10 });
      expect(heuristic.method).toBe("heuristic");
      const best = exact.alternatives[0].cost;
      expect(heuristic.alternatives[0].cost).toBeGreaterThanOrEqual(best - 1e-9);
      expect(heuristic.alternatives[0].cost).toBeLessThanOrEqual(best * 1.02 + 1e-9);
      // Las alternativas también quedan cerca de las exhaustivas.
      expect(heuristic.alternatives[4].cost).toBeLessThanOrEqual(exact.alternatives[4].cost * 1.1 + 1e-9);
      expect(heuristic.alternatives).toHaveLength(5);
    }
  });

  it("es determinista con la misma semilla", () => {
    const players = randomPlayers(26, 5);
    const x = balanceTeams(players, {}, { seed: 42 });
    const y = balanceTeams(players, {}, { seed: 42 });
    expect(x.method).toBe("heuristic");
    expect(y.alternatives).toEqual(x.alternatives);
    expect(balanceTeams(players).alternatives).toEqual(balanceTeams(players).alternatives);
  });

  it("respeta las restricciones y la distinción entre alternativas", () => {
    const players = randomPlayers(28, 8);
    const constraints: Constraints = {
      pinned: { p5: "a", p6: "b" },
      together: [
        ["p1", "p2"],
        ["p10", "p11"],
      ],
      apart: [
        ["p3", "p4"],
        ["p1", "p12"],
      ],
    };
    const result = balanceTeams(players, constraints, { minDiff: 3 });
    expect(result.method).toBe("heuristic");
    expectHonors(result, constraints);
    expectValidSizes(result, 28);
    const alts = result.alternatives;
    for (let x = 0; x < alts.length; x++) {
      for (let y = x + 1; y < alts.length; y++) expect(splitDistance(alts[x], alts[y])).toBeGreaterThanOrEqual(3);
    }
  });

  it("maneja cantidades impares grandes y separa arqueros", () => {
    const result = balanceTeams(randomPlayers(31, 3, { goalkeepers: 2 }));
    expect(result.method).toBe("heuristic");
    expectValidSizes(result, 31);
    expect(result.alternatives[0].metrics.gkA).toBe(1);
    expect(result.alternatives[0].metrics.levelDiff).toBeLessThan(0.1);
  });

  it("procesa 40 jugadores rápido", () => {
    const start = performance.now();
    const result = balanceTeams(randomPlayers(40, 40));
    expect(result.alternatives).toHaveLength(5);
    expect(performance.now() - start).toBeLessThan(5000);
  });
});

describe("balanceTeams · validación", () => {
  const players = randomPlayers(10, 1);

  it.each<[string, BalancerPlayer[], Constraints, RegExp]>([
    ["menos de 6 jugadores", randomPlayers(5, 1), {}, /al menos 6 jugadores \(hay 5\)/],
    ["jugador repetido", [...players, players[0]], {}, /repetido/],
    ["id desconocido", players, { apart: [["p1", "zz"]] }, /no está convocado \(zz\)/],
    ["fijado desconocido", players, { pinned: { nadie: "a" } }, /no está convocado/],
    ["separado de sí mismo", players, { apart: [["p1", "p1"]] }, /sí mismo/],
    ["juntos fijados en equipos distintos", players, { pinned: { p1: "a", p2: "b" }, together: [["p1", "p2"]] }, /fijados en equipos distintos/],
    ["juntos (transitivo) fijados en equipos distintos", players, { pinned: { p1: "a", p3: "b" }, together: [["p1", "p2"], ["p2", "p3"]] }, /fijados en equipos distintos/],
    ["separados fijados en el mismo equipo", players, { pinned: { p1: "a", p2: "a" }, apart: [["p1", "p2"]] }, /mismo equipo/],
    ["juntos y separados a la vez", players, { together: [["p1", "p2"]], apart: [["p2", "p1"]] }, /juntos y separados/],
    ["separados imposibles (triángulo)", players, { apart: [["p1", "p2"], ["p2", "p3"], ["p3", "p1"]] }, /separados entre sí/],
    ["grupo de juntos más grande que un equipo", players, { together: [["p0", "p1"], ["p1", "p2"], ["p2", "p3"], ["p3", "p4"], ["p4", "p5"]] }, /no entran en un equipo de 5/],
    ["demasiados fijados en un equipo", players, { pinned: { p0: "a", p1: "a", p2: "a", p3: "a", p4: "a", p5: "a" } }, /equipos de 5 jugadores cada uno/],
    ["fijados y separados contradictorios", players, { pinned: { p1: "a", p3: "b" }, apart: [["p1", "p2"], ["p2", "p3"], ["p3", "p4"]] }, /se contradicen/],
  ])("%s", (_, list, constraints, message) => {
    const result = balanceTeams(list, constraints);
    expect(result.alternatives).toEqual([]);
    expect(result.evaluated).toBe(0);
    expect(result.violations.join(" ")).toMatch(message);
  });

  it("acepta restricciones que solo parecen exigentes", () => {
    const constraints: Constraints = {
      pinned: { p1: "a", p2: "a", p3: "a", p4: "a" },
      apart: [
        ["p0", "p5"],
        ["p5", "p6"],
      ],
    };
    // p0 y p6 van juntos; si fueran a A serían 6: la única salida es p5 en A.
    const result = balanceTeams(players, constraints);
    expect(result.violations).toEqual([]);
    expectHonors(result, constraints);
    for (const alt of result.alternatives) expect(alt.a).toEqual(["p1", "p2", "p3", "p4", "p5"]);
    expect(result.alternatives).toHaveLength(1);
  });

  it("ignora 'juntos' de un jugador consigo mismo", () => {
    const result = balanceTeams(players, { together: [["p1", "p1"]] });
    expect(result.violations).toEqual([]);
  });
});
