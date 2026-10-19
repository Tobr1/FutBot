/**
 * Validación de la entrada y de las restricciones duras (fijados, juntos, separados).
 * Detecta combinaciones imposibles antes de buscar y arma una asignación factible
 * que la heurística usa como semilla de respaldo.
 */
import type { BalancerPlayer, Constraints } from "./types";

export const MIN_PLAYERS = 6;

/** Restricciones traducidas a índices de jugador. */
export interface IndexedConstraints {
  /** −1 libre, 0 fijado en A, 1 fijado en B. */
  pinned: Int8Array;
  hasPins: boolean;
  together: Array<[number, number]>;
  apart: Array<[number, number]>;
  /** Grupos de jugadores que juegan juntos (componentes de "juntos"); singletons incluidos. */
  units: number[][];
  unitOf: Int32Array;
  /** −1 libre, 0 / 1 si algún integrante está fijado. */
  unitPin: Int8Array;
  /** Compañeros de "separados" de cada jugador. */
  apartOf: number[][];
}

export interface ConstraintAnalysis {
  violations: string[];
  indexed: IndexedConstraints | null;
  /** Una asignación válida (0 = A, 1 = B) cuando no hay violaciones. */
  feasible: Uint8Array | null;
}

/** "A", "A y B", "A, B y C". */
export function joinNames(names: readonly string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

export function teamSizes(n: number): [number, number] {
  return [Math.floor(n / 2), Math.ceil(n / 2)];
}

export function analyzeConstraints(players: readonly BalancerPlayer[], constraints: Constraints = {}): ConstraintAnalysis {
  const violations: string[] = [];
  const fail = (): ConstraintAnalysis => ({ violations, indexed: null, feasible: null });
  const n = players.length;

  if (n < MIN_PLAYERS) violations.push(`Se necesitan al menos ${MIN_PLAYERS} jugadores (hay ${n}).`);

  const index = new Map<string, number>();
  players.forEach((p, i) => {
    if (index.has(p.id)) violations.push(`${p.name} está repetido en la lista.`);
    else index.set(p.id, i);
    if (!Number.isFinite(p.skill)) violations.push(`${p.name} no tiene un nivel válido.`);
    if (p.sigma !== undefined && !Number.isFinite(p.sigma)) violations.push(`${p.name} tiene una incertidumbre inválida.`);
    if (p.form !== undefined && !Number.isFinite(p.form)) violations.push(`${p.name} tiene una forma reciente inválida.`);
  });

  const unknown = new Set<string>();
  const resolve = (id: string): number => {
    const i = index.get(id);
    if (i === undefined) unknown.add(id);
    return i ?? -1;
  };
  const name = (i: number) => players[i].name;

  const pinned = new Int8Array(n).fill(-1);
  for (const [id, side] of Object.entries(constraints.pinned ?? {})) {
    const i = resolve(id);
    if (i >= 0) pinned[i] = side === "a" ? 0 : 1;
  }
  const pairs = (list: Array<[string, string]> | undefined) =>
    (list ?? []).map(([x, y]) => [resolve(x), resolve(y)] as [number, number]).filter(([i, j]) => i >= 0 && j >= 0);
  const together = pairs(constraints.together).filter(([i, j]) => i !== j);
  const apart = pairs(constraints.apart);

  for (const id of unknown) violations.push(`Hay una restricción con un jugador que no está convocado (${id}).`);
  for (const [i, j] of apart) {
    if (i === j) violations.push(`${name(i)} no puede jugar separado de sí mismo.`);
  }
  if (violations.length) return fail();

  // Grupos de "juntos" (union-find).
  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (i: number): number => {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  };
  for (const [i, j] of together) parent[find(i)] = find(j);

  const unitOf = new Int32Array(n);
  const units: number[][] = [];
  const rootUnit = new Map<number, number>();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    let u = rootUnit.get(r);
    if (u === undefined) {
      u = units.length;
      rootUnit.set(r, u);
      units.push([]);
    }
    units[u].push(i);
    unitOf[i] = u;
  }

  const [small, big] = teamSizes(n);
  const unitPin = new Int8Array(units.length).fill(-1);
  units.forEach((members, u) => {
    const inA = members.find((i) => pinned[i] === 0);
    const inB = members.find((i) => pinned[i] === 1);
    if (inA !== undefined && inB !== undefined) {
      violations.push(`${name(inA)} y ${name(inB)} tienen que jugar juntos pero están fijados en equipos distintos.`);
    } else if (inA !== undefined) unitPin[u] = 0;
    else if (inB !== undefined) unitPin[u] = 1;
    if (members.length > big) {
      violations.push(
        `${joinNames(members.map(name))} tienen que jugar juntos y son ${members.length}: no entran en un equipo de ${big}.`,
      );
    }
  });

  const apartOf: number[][] = Array.from({ length: n }, () => []);
  for (const [i, j] of apart) {
    if (unitOf[i] === unitOf[j]) {
      violations.push(`${name(i)} y ${name(j)} no pueden jugar juntos y separados a la vez.`);
      continue;
    }
    const pi = unitPin[unitOf[i]];
    if (pi >= 0 && pi === unitPin[unitOf[j]]) {
      violations.push(`${name(i)} y ${name(j)} tienen que jugar separados pero están fijados en el mismo equipo.`);
    }
    apartOf[i].push(j);
    apartOf[j].push(i);
  }
  if (violations.length) return fail();

  // Separados entre grupos: cada componente del grafo se 2-colorea (color 0 / 1).
  const unitApart: Array<Set<number>> = units.map(() => new Set());
  for (const [i, j] of apart) {
    unitApart[unitOf[i]].add(unitOf[j]);
    unitApart[unitOf[j]].add(unitOf[i]);
  }
  const color = new Int8Array(units.length).fill(-1);
  interface Component {
    units: number[];
    size: [number, number];
    /** null = se puede dar vuelta; 0 = color 0 va a A; 1 = color 0 va a B. */
    orientation: 0 | 1 | null;
  }
  const components: Component[] = [];
  for (let start = 0; start < units.length; start++) {
    if (color[start] >= 0) continue;
    const comp: Component = { units: [], size: [0, 0], orientation: null };
    color[start] = 0;
    const queue = [start];
    let bipartite = true;
    let pinConflict = false;
    while (queue.length) {
      const u = queue.shift()!;
      comp.units.push(u);
      comp.size[color[u]] += units[u].length;
      if (unitPin[u] >= 0) {
        const orientation = (unitPin[u] ^ color[u]) as 0 | 1;
        if (comp.orientation === null) comp.orientation = orientation;
        else if (comp.orientation !== orientation) pinConflict = true;
      }
      for (const v of unitApart[u]) {
        if (color[v] < 0) {
          color[v] = (1 - color[u]) as 0 | 1;
          queue.push(v);
        } else if (color[v] === color[u]) bipartite = false;
      }
    }
    const names = joinNames(comp.units.flatMap((u) => units[u]).map(name));
    if (!bipartite) violations.push(`No se puede cumplir que ${names} jueguen todos separados entre sí.`);
    else if (pinConflict) violations.push(`Los jugadores fijados y los separados se contradicen (${names}).`);
    components.push(comp);
  }
  if (violations.length) return fail();

  // Cantidad: elegir la orientación de cada componente para que A tenga floor(n/2) o ceil(n/2).
  // reach[c][s] = cómo llegar a s jugadores en A con las primeras c componentes (−1 = imposible).
  const reach: Int8Array[] = [new Int8Array(n + 1).fill(-1)];
  reach[0][0] = 0;
  components.forEach((comp, c) => {
    const prev = reach[c];
    const next = new Int8Array(n + 1).fill(-1);
    for (let s = 0; s <= n; s++) {
      if (prev[s] < 0) continue;
      for (const o of [0, 1] as const) {
        if (comp.orientation !== null && comp.orientation !== o) continue;
        const add = comp.size[o];
        if (s + add <= n && next[s + add] < 0) next[s + add] = o;
      }
    }
    reach.push(next);
  });
  const last = reach[components.length];
  const target = [small, big].find((s) => last[s] >= 0);
  if (target === undefined) {
    const sizes = small === big ? `de ${small} jugadores cada uno` : `de ${small} y ${big}`;
    violations.push(`No se pueden armar dos equipos ${sizes} respetando las restricciones.`);
    return fail();
  }

  const feasible = new Uint8Array(n);
  let s = target;
  for (let c = components.length - 1; c >= 0; c--) {
    const comp = components[c];
    const o = reach[c + 1][s];
    for (const u of comp.units) {
      // Con orientación 0 el color 0 va a A (lado 0).
      const side = color[u] ^ o;
      for (const i of units[u]) feasible[i] = side;
    }
    s -= comp.size[o];
  }

  return {
    violations,
    indexed: {
      pinned,
      hasPins: pinned.some((p) => p >= 0),
      together,
      apart,
      units,
      unitOf,
      unitPin,
      apartOf,
    },
    feasible,
  };
}

/** Verifica una asignación (0 = A, 1 = B) contra las restricciones indexadas. */
export function satisfies(side: ArrayLike<number>, c: IndexedConstraints): boolean {
  for (let i = 0; i < c.pinned.length; i++) if (c.pinned[i] >= 0 && c.pinned[i] !== side[i]) return false;
  for (const [i, j] of c.together) if (side[i] !== side[j]) return false;
  for (const [i, j] of c.apart) if (side[i] === side[j]) return false;
  return true;
}
