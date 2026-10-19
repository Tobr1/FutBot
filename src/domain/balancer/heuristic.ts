/**
 * Heurística para muchos jugadores (ANALISIS §7.3):
 *  1. Semillas: draft en serpiente por nivel + varias aleatorias reproducibles (mulberry32) +
 *     la asignación factible que arma la validación.
 *  2. Búsqueda local: mejor intercambio entre equipos hasta que ninguno mejore.
 *  3. Recocido simulado corto para escapar de mínimos locales y búsqueda local final.
 * Las restricciones se respetan en cada movimiento: los grupos de "juntos" se mueven enteros,
 * los fijados no se mueven y ningún movimiento junta a dos "separados".
 * Movimientos: intercambiar dos grupos del mismo tamaño, un par contra dos sueltos y, con
 * cantidad impar, pasar un suelto del equipo largo al corto.
 */
import { aggregate, type CostContext, costOf, F_SKILL, NF } from "./cost";
import { type IndexedConstraints, teamSizes } from "./constraints";
import type { SearchOutput } from "./exhaustive";
import { TopK } from "./topk";

export const DEFAULT_SEED = 20240611;
const RANDOM_SEEDS = 24;
const ANNEALING_STEPS_PER_PLAYER = 500;
const EPS = 1e-12;

/** Generador pseudoaleatorio determinista de 32 bits (mulberry32). Devuelve [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Move {
  /** Grupos que pasan de A a B y de B a A. */
  fromA: number[];
  fromB: number[];
}

export function searchHeuristic(
  ctx: CostContext,
  cons: IndexedConstraints,
  feasible: Uint8Array,
  opts: { topK: number; minDiff: number; seed: number },
): SearchOutput {
  const n = ctx.n;
  const { units, unitPin } = cons;
  const rand = mulberry32(opts.seed);
  const [, big] = teamSizes(n);
  const odd = n % 2 === 1;
  const feats = ctx.features;
  let evaluated = 0;

  const unitAgg = units.map((members) => {
    const sum = new Float64Array(NF);
    for (const i of members) for (let f = 0; f < NF; f++) sum[f] += feats[i * NF + f];
    return sum;
  });
  const movable = units.map((_, u) => unitPin[u] < 0);

  const top = new TopK<Uint8Array>(
    opts.topK,
    opts.minDiff,
    (x, y) => {
      let h = 0;
      for (let i = 0; i < n; i++) if (x[i] !== y[i]) h++;
      return Math.min(h, n - h);
    },
    (key) => key.slice(),
  );

  // Estado actual.
  const side = new Uint8Array(n);
  const agg = new Float64Array(NF);
  const tmp = new Float64Array(NF);
  let sizeA = 0;
  let cost = 0;

  const unitSide = (u: number) => side[units[u][0]];

  const load = (assignment: Uint8Array) => {
    side.set(assignment);
    aggregate(side, ctx, agg);
    sizeA = 0;
    for (let i = 0; i < n; i++) if (side[i] === 0) sizeA++;
    cost = costOf(agg, ctx);
    evaluated++;
  };

  const moving = new Uint8Array(n);
  /** Costo tras el movimiento, o NaN si junta a dos "separados". */
  const evaluate = (move: Move): number => {
    tmp.set(agg);
    for (const u of move.fromA) {
      const s = unitAgg[u];
      for (let f = 0; f < NF; f++) tmp[f] -= s[f];
    }
    for (const u of move.fromB) {
      const s = unitAgg[u];
      for (let f = 0; f < NF; f++) tmp[f] += s[f];
    }
    if (cons.apart.length) {
      for (const u of move.fromA) for (const i of units[u]) moving[i] = 1;
      for (const u of move.fromB) for (const i of units[u]) moving[i] = 1;
      let ok = true;
      outer: for (const list of [move.fromA, move.fromB]) {
        for (const u of list) {
          for (const i of units[u]) {
            for (const j of cons.apartOf[i]) {
              if ((side[i] ^ moving[i]) === (side[j] ^ moving[j])) {
                ok = false;
                break outer;
              }
            }
          }
        }
      }
      for (const u of move.fromA) for (const i of units[u]) moving[i] = 0;
      for (const u of move.fromB) for (const i of units[u]) moving[i] = 0;
      if (!ok) return NaN;
    }
    evaluated++;
    return costOf(tmp, ctx);
  };

  const apply = (move: Move, newCost: number) => {
    for (const u of move.fromA) {
      for (const i of units[u]) side[i] = 1;
      sizeA -= units[u].length;
      const s = unitAgg[u];
      for (let f = 0; f < NF; f++) agg[f] -= s[f];
    }
    for (const u of move.fromB) {
      for (const i of units[u]) side[i] = 0;
      sizeA += units[u].length;
      const s = unitAgg[u];
      for (let f = 0; f < NF; f++) agg[f] += s[f];
    }
    cost = newCost;
  };

  /** Todos los movimientos válidos en tamaño desde el estado actual. */
  const moves = (): Move[] => {
    const inA: number[] = [];
    const inB: number[] = [];
    units.forEach((_, u) => {
      if (movable[u]) (unitSide(u) === 0 ? inA : inB).push(u);
    });
    const list: Move[] = [];
    for (const ua of inA) {
      for (const ub of inB) {
        if (units[ua].length === units[ub].length) list.push({ fromA: [ua], fromB: [ub] });
      }
    }
    // Un par contra dos sueltos (en los dos sentidos).
    const pairVsSingles = (pairs: number[], others: number[], pairFromA: boolean) => {
      const singles = others.filter((u) => units[u].length === 1);
      for (const p of pairs) {
        if (units[p].length !== 2) continue;
        for (let x = 0; x < singles.length; x++) {
          for (let y = x + 1; y < singles.length; y++) {
            const two = [singles[x], singles[y]];
            list.push(pairFromA ? { fromA: [p], fromB: two } : { fromA: two, fromB: [p] });
          }
        }
      }
    };
    pairVsSingles(inA, inB, true);
    pairVsSingles(inB, inA, false);
    if (odd) {
      if (sizeA === big) for (const u of inA) if (units[u].length === 1) list.push({ fromA: [u], fromB: [] });
      if (n - sizeA === big) for (const u of inB) if (units[u].length === 1) list.push({ fromA: [], fromB: [u] });
    }
    return list;
  };

  const localSearch = () => {
    for (let guard = 0; guard < 10 * n; guard++) {
      let best: Move | null = null;
      let bestCost = cost - EPS;
      for (const move of moves()) {
        const c = evaluate(move);
        if (c < bestCost) {
          bestCost = c;
          best = move;
        }
      }
      if (!best) return;
      apply(best, bestCost);
    }
  };

  const movableUnits = units.map((_, u) => u).filter((u) => movable[u]);
  /** Una unidad movible al azar que cumpla la condición (por rechazo; null si no aparece). */
  const pick = (accept: (u: number) => boolean): number | null => {
    for (let tries = 0; tries < 24; tries++) {
      const u = movableUnits[Math.floor(rand() * movableUnits.length)];
      if (accept(u)) return u;
    }
    return null;
  };
  /** Un movimiento al azar válido en tamaño, o null. */
  const randomMove = (): Move | null => {
    const u = pick(() => true);
    if (u === null) return null;
    const s = unitSide(u);
    const size = units[u].length;
    const wrap = (mine: number[], theirs: number[]): Move =>
      s === 0 ? { fromA: mine, fromB: theirs } : { fromA: theirs, fromB: mine };
    const sideSize = s === 0 ? sizeA : n - sizeA;
    if (odd && size === 1 && sideSize === big && rand() < 0.25) return wrap([u], []);
    if (size === 2 && rand() < 0.5) {
      const x = pick((v) => unitSide(v) !== s && units[v].length === 1);
      const y = x === null ? null : pick((v) => v !== x && unitSide(v) !== s && units[v].length === 1);
      if (x !== null && y !== null) return wrap([u], [x, y]);
    }
    const v = pick((w) => unitSide(w) !== s && units[w].length === size);
    return v === null ? null : wrap([u], [v]);
  };

  const anneal = () => {
    if (!movableUnits.length) return;
    const steps = ANNEALING_STEPS_PER_PLAYER * n;
    const bestSide = side.slice();
    let bestCost = cost;
    // Temperatura inicial ≈ cambio típico de costo de un movimiento al azar.
    let sample = 0;
    let count = 0;
    for (let s = 0; s < 30; s++) {
      const move = randomMove();
      const c = move ? evaluate(move) : NaN;
      if (Number.isFinite(c)) {
        sample += Math.abs(c - cost);
        count++;
      }
    }
    const t0 = count && sample > 0 ? sample / count : 1;
    const cooling = Math.pow(1e-3, 1 / steps);
    let temp = t0;
    for (let s = 0; s < steps; s++, temp *= cooling) {
      const move = randomMove();
      if (!move) continue;
      const c = evaluate(move);
      if (Number.isNaN(c)) continue;
      if (c <= cost || rand() < Math.exp((cost - c) / temp)) {
        apply(move, c);
        if (cost < top.threshold) top.offer(side, cost);
        if (cost < bestCost - EPS) {
          bestCost = cost;
          bestSide.set(side);
        }
      }
    }
    load(bestSide);
  };

  for (const seed of buildSeeds(ctx, cons, feasible, rand)) {
    load(seed);
    localSearch();
    top.offer(side, cost);
    anneal();
    localSearch();
    top.offer(side, cost);
  }

  const solutions = top.result().map(({ key, cost }) => {
    const out = key.slice();
    // Sin fijados el color no importa: el equipo A es el del primer jugador.
    if (!cons.hasPins && out[0] === 1) for (let i = 0; i < n; i++) out[i] ^= 1;
    return { side: out, cost };
  });
  return { solutions, evaluated };
}

/**
 * Semillas válidas: serpiente por nivel y órdenes aleatorios, ubicando grupo por grupo
 * (primero los fijados) en el lado preferido si entra y no junta separados; si un intento se
 * traba se descarta. La asignación factible de la validación siempre está.
 */
function buildSeeds(ctx: CostContext, cons: IndexedConstraints, feasible: Uint8Array, rand: () => number): Uint8Array[] {
  const n = ctx.n;
  const { units, unitPin } = cons;
  const [, big] = teamSizes(n);
  const strength = units.map((members) => members.reduce((s, i) => s + ctx.features[i * NF + F_SKILL], 0));

  const place = (order: number[], preferred: (k: number) => number): Uint8Array | null => {
    const side = new Uint8Array(n).fill(2);
    const size = [0, 0];
    const fixed = units.map((_, u) => u).filter((u) => unitPin[u] >= 0);
    const free = order.filter((u) => unitPin[u] < 0);
    const fits = (u: number, s: number) =>
      size[s] + units[u].length <= big && units[u].every((i) => cons.apartOf[i].every((j) => side[j] !== s));
    const put = (u: number, s: number) => {
      for (const i of units[u]) side[i] = s;
      size[s] += units[u].length;
    };
    for (const u of fixed) {
      if (!fits(u, unitPin[u])) return null;
      put(u, unitPin[u]);
    }
    for (let k = 0; k < free.length; k++) {
      const u = free[k];
      const first = preferred(k);
      if (fits(u, first)) put(u, first);
      else if (fits(u, 1 - first)) put(u, 1 - first);
      else return null;
    }
    return side;
  };

  const seeds: Uint8Array[] = [feasible.slice()];
  const bySkill = units.map((_, u) => u).sort((x, y) => strength[y] - strength[x] || x - y);
  // Serpiente: A B B A A B B A …
  const snake = place(bySkill, (k) => (k % 4 === 0 || k % 4 === 3 ? 0 : 1));
  if (snake) seeds.push(snake);

  for (let r = 0; r < RANDOM_SEEDS; r++) {
    const order = units.map((_, u) => u);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const seed = place(order, () => (rand() < 0.5 ? 0 : 1));
    if (seed) seeds.push(seed);
  }
  return seeds;
}
