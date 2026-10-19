/**
 * Utilidades compartidas por los tests del armado de equipos (no se exportan desde index).
 */
import { analyzeConstraints, satisfies } from "./constraints";
import { evaluateSplit } from "./cost";
import { mulberry32 } from "./heuristic";
import type { BalancerOptions, BalancerPlayer, Constraints, Position, TeamSplit } from "./types";

const POSITIONS: Position[] = ["goalkeeper", "defender", "midfielder", "forward"];

/** Plantel pseudoaleatorio reproducible con niveles, posiciones, σ y forma. */
export function randomPlayers(n: number, seed: number, opts: { goalkeepers?: number } = {}): BalancerPlayer[] {
  const rand = mulberry32(seed);
  const gks = opts.goalkeepers ?? (n >= 10 ? 2 : 1);
  return Array.from({ length: n }, (_, i) => {
    const primary: Position = i < gks ? "goalkeeper" : POSITIONS[1 + Math.floor(rand() * 3)];
    const secondary: Position | null = rand() < 0.5 ? POSITIONS[1 + Math.floor(rand() * 3)] : null;
    return {
      id: `p${i}`,
      name: `Jugador ${i}`,
      skill: Math.round((3 + rand() * 6) * 10) / 10,
      sigma: rand() < 0.2 ? 2 : 0.5 + rand() * 0.5,
      form: Math.round((rand() - 0.5) * 10) / 10,
      primary,
      secondary: secondary === primary ? null : secondary,
    };
  });
}

/** Clave de una partición sin importar el color. */
export function partitionKey(a: readonly string[], b: readonly string[]): string {
  const x = [...a].sort().join(",");
  const y = [...b].sort().join(",");
  return x < y ? `${x}|${y}` : `${y}|${x}`;
}

/** Jugadores que hay que mover para pasar de una partición a otra. */
export function splitDistance(x: TeamSplit, y: TeamSplit): number {
  const inA = new Set(y.a);
  const n = x.a.length + x.b.length;
  const h = x.a.filter((id) => !inA.has(id)).length + x.b.filter((id) => inA.has(id)).length;
  return Math.min(h, n - h);
}

/**
 * Fuerza bruta independiente: todas las asignaciones con colores (2^n) de tamaños válidos que
 * cumplen las restricciones, agrupadas por partición. Devuelve los costos ordenados.
 */
export function bruteForce(
  players: readonly BalancerPlayer[],
  constraints: Constraints = {},
  options: BalancerOptions = {},
): Array<{ key: string; cost: number }> {
  const n = players.length;
  const { indexed } = analyzeConstraints(players, constraints);
  if (!indexed) return [];
  const seen = new Map<string, number>();
  const side = new Uint8Array(n);
  for (let mask = 0; mask < 1 << n; mask++) {
    let sizeA = 0;
    for (let i = 0; i < n; i++) {
      side[i] = (mask >> i) & 1 ? 0 : 1;
      if (side[i] === 0) sizeA++;
    }
    if (sizeA !== Math.floor(n / 2) && sizeA !== Math.ceil(n / 2)) continue;
    if (!satisfies(side, indexed)) continue;
    const a = players.filter((_, i) => side[i] === 0).map((p) => p.id);
    const b = players.filter((_, i) => side[i] === 1).map((p) => p.id);
    const key = partitionKey(a, b);
    if (!seen.has(key)) seen.set(key, evaluateSplit(players, a, b, options).cost);
  }
  return [...seen].map(([key, cost]) => ({ key, cost })).sort((x, y) => x.cost - y.cost);
}
