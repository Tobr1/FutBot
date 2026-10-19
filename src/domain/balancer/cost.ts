/**
 * Función de costo del armado de equipos (ANALISIS §7.2). Menor = más parejo.
 *
 *   J(A,B) = w_nivel · |ΣS_A − ΣS_B| / (n/2)
 *          + w_pos   · penalización de posiciones
 *          + w_forma · |Σforma_A − Σforma_B| / (n/2)
 *          + w_inc   · |Σσ²_A − Σσ²_B|
 *          + w_rep   · solapamiento con los equipos del partido anterior (0-1)
 *
 * Penalización de posiciones: |ARQ_A − ARQ_B| + |DEF_A − DEF_B| + |MED_A − MED_B| + |DEL_A − DEL_B|
 * con conteos ponderados (principal = 1, secundaria = 0,5), más una penalización fuerte
 * (`GOALKEEPERS_SAME_TEAM_PENALTY`) si hay 2 o más arqueros naturales y un equipo se queda sin ninguno.
 *
 * Cantidad impar: los equipos difieren en un jugador y se comparan SUMAS, no promedios.
 * Así el equipo corto recibe jugadores algo mejores para compensar al que tiene uno más.
 *
 * Repetición: entre los m jugadores que también jugaron el partido anterior se cuentan los que
 * quedan en el mismo equipo que entonces (tomando la mejor correspondencia de colores, porque los
 * colores no importan). El término vale 0 cuando la mitad cambió de equipo y 1 cuando son los mismos.
 */
import { BALANCER_POSITIONS, type BalancerOptions, type BalancerPlayer, type BalancerWeights, type Position, type SplitMetrics } from "./types";

/**
 * Pesos por defecto. Calibración: 0,1 puntos por jugador de diferencia de nivel cuesta 1,
 * lo mismo que un defensor de más de un lado (diferencia 2 → 2) cuesta 0,2 puntos por jugador.
 * Dos arqueros en el mismo equipo (10 + 2) equivalen a 1,2 puntos por jugador: casi una regla dura.
 * Dos jugadores nuevos con σ = 2 juntos (|8| · 0,25 = 2) equivalen a 0,2 puntos por jugador.
 * Repetir exactamente los equipos anteriores cuesta 1 (0,1 puntos por jugador): desempata, no manda.
 */
export const DEFAULT_WEIGHTS: Readonly<BalancerWeights> = Object.freeze({
  level: 10,
  positions: 1,
  form: 3,
  uncertainty: 0.25,
  repetition: 1,
});

/** Penalización (antes del peso de posiciones) si hay 2+ arqueros y todos quedan del mismo lado. */
export const GOALKEEPERS_SAME_TEAM_PENALTY = 10;

/** Peso de la posición secundaria en los conteos. */
export const SECONDARY_POSITION_WEIGHT = 0.5;

// Índices de las características por jugador (sumas acumulables por equipo).
export const F_SKILL = 0;
export const F_FORM = 1;
export const F_SIGMA2 = 2;
export const F_GK = 3;
export const F_GK_W = 4;
export const F_DEF_W = 5;
export const F_MID_W = 6;
export const F_FWD_W = 7;
export const F_PREV_A = 8;
export const F_PREV_B = 9;
export const NF = 10;

const POSITION_FEATURE: Record<Position, number> = {
  goalkeeper: F_GK_W,
  defender: F_DEF_W,
  midfielder: F_MID_W,
  forward: F_FWD_W,
};

/** Datos precalculados para evaluar particiones sin recorrer objetos. */
export interface CostContext {
  n: number;
  /** n × NF, fila por jugador. */
  features: Float64Array;
  /** Suma de cada característica sobre todos los jugadores. */
  totals: Float64Array;
  weights: BalancerWeights;
  /** Tamaño por equipo usado para normalizar: n / 2. */
  half: number;
  /** Arqueros naturales convocados. */
  totalGk: number;
  /** Jugadores presentes que también jugaron el partido anterior. */
  prevCount: number;
}

export function resolveWeights(weights?: Partial<BalancerWeights>): BalancerWeights {
  const out = { ...DEFAULT_WEIGHTS };
  if (weights) {
    for (const key of Object.keys(out) as Array<keyof BalancerWeights>) {
      const w = weights[key];
      if (typeof w === "number" && Number.isFinite(w) && w >= 0) out[key] = w;
    }
  }
  return out;
}

export function prepareContext(players: readonly BalancerPlayer[], options: BalancerOptions = {}): CostContext {
  const n = players.length;
  const features = new Float64Array(n * NF);
  const totals = new Float64Array(NF);
  const prevA = new Set(options.previousTeams?.a ?? []);
  const prevB = new Set(options.previousTeams?.b ?? []);
  let prevCount = 0;

  players.forEach((p, i) => {
    const row = i * NF;
    const sigma = p.sigma ?? 0;
    features[row + F_SKILL] = p.skill;
    features[row + F_FORM] = p.form ?? 0;
    features[row + F_SIGMA2] = sigma * sigma;
    if (p.primary === "goalkeeper") features[row + F_GK] = 1;
    if (p.primary) features[row + POSITION_FEATURE[p.primary]] += 1;
    if (p.secondary && p.secondary !== p.primary) {
      features[row + POSITION_FEATURE[p.secondary]] += SECONDARY_POSITION_WEIGHT;
    }
    if (prevA.has(p.id)) {
      features[row + F_PREV_A] = 1;
      prevCount++;
    } else if (prevB.has(p.id)) {
      features[row + F_PREV_B] = 1;
      prevCount++;
    }
    for (let f = 0; f < NF; f++) totals[f] += features[row + f];
  });

  return {
    n,
    features,
    totals,
    weights: resolveWeights(options.weights),
    half: n / 2,
    totalGk: totals[F_GK],
    prevCount,
  };
}

/**
 * Costo de una partición a partir de las sumas del equipo A (las de B salen de los totales).
 * Es simétrico: intercambiar A y B da el mismo costo.
 */
export function costOf(aggA: ArrayLike<number>, ctx: CostContext): number {
  const t = ctx.totals;
  const w = ctx.weights;

  // |ΣA − ΣB| = |2·ΣA − Σtotal|
  const level = Math.abs(2 * aggA[F_SKILL] - t[F_SKILL]) / ctx.half;

  let positions =
    Math.abs(2 * aggA[F_GK_W] - t[F_GK_W]) +
    Math.abs(2 * aggA[F_DEF_W] - t[F_DEF_W]) +
    Math.abs(2 * aggA[F_MID_W] - t[F_MID_W]) +
    Math.abs(2 * aggA[F_FWD_W] - t[F_FWD_W]);
  if (ctx.totalGk >= 2) {
    const gk = aggA[F_GK];
    if (gk < 0.5 || gk > ctx.totalGk - 0.5) positions += GOALKEEPERS_SAME_TEAM_PENALTY;
  }

  const form = Math.abs(2 * aggA[F_FORM] - t[F_FORM]) / ctx.half;
  const uncertainty = Math.abs(2 * aggA[F_SIGMA2] - t[F_SIGMA2]);

  let repetition = 0;
  if (ctx.prevCount > 0) {
    const m2 = ctx.prevCount / 2;
    repetition = (sameTeamCount(aggA, ctx) - m2) / m2;
  }

  return (
    w.level * level + w.positions * positions + w.form * form + w.uncertainty * uncertainty + w.repetition * repetition
  );
}

/** Jugadores que repiten equipo respecto del partido anterior, con la mejor correspondencia de colores. */
function sameTeamCount(aggA: ArrayLike<number>, ctx: CostContext): number {
  const t = ctx.totals;
  const same = aggA[F_PREV_A] + (t[F_PREV_B] - aggA[F_PREV_B]);
  const cross = aggA[F_PREV_B] + (t[F_PREV_A] - aggA[F_PREV_A]);
  return Math.max(same, cross);
}

/** Sumas del equipo A para una asignación `side` (0 = A, 1 = B). */
export function aggregate(side: ArrayLike<number>, ctx: CostContext, out = new Float64Array(NF)): Float64Array {
  out.fill(0);
  const feats = ctx.features;
  for (let i = 0; i < ctx.n; i++) {
    if (side[i] !== 0) continue;
    const row = i * NF;
    for (let f = 0; f < NF; f++) out[f] += feats[row + f];
  }
  return out;
}

/** Métricas legibles de una asignación `side` (0 = A, 1 = B). */
export function computeMetrics(side: ArrayLike<number>, ctx: CostContext): SplitMetrics {
  const a = aggregate(side, ctx);
  const t = ctx.totals;
  const b = t.map((total, f) => total - a[f]);
  let sizeA = 0;
  for (let i = 0; i < ctx.n; i++) if (side[i] === 0) sizeA++;
  const sizeB = ctx.n - sizeA;

  const counts = (agg: ArrayLike<number>) =>
    Object.fromEntries(BALANCER_POSITIONS.map((pos) => [pos, agg[POSITION_FEATURE[pos]]])) as Record<Position, number>;

  const diff = Math.abs(a[F_SKILL] - b[F_SKILL]);
  const changes = ctx.prevCount > 0 ? ctx.prevCount - sameTeamCount(a, ctx) : null;

  return {
    sumA: a[F_SKILL],
    sumB: b[F_SKILL],
    avgA: sizeA ? a[F_SKILL] / sizeA : 0,
    avgB: sizeB ? b[F_SKILL] / sizeB : 0,
    levelDiff: ctx.half ? diff / ctx.half : 0,
    levelDiffPct: t[F_SKILL] > 0 ? (diff / (t[F_SKILL] / 2)) * 100 : 0,
    gkA: a[F_GK],
    gkB: b[F_GK],
    positionCounts: { a: counts(a), b: counts(b) },
    formDiff: ctx.half ? Math.abs(a[F_FORM] - b[F_FORM]) / ctx.half : 0,
    uncertaintyDiff: Math.abs(a[F_SIGMA2] - b[F_SIGMA2]),
    repetitionOverlap: changes === null ? null : (ctx.prevCount - changes) / ctx.prevCount,
    repetitionChanges: changes,
  };
}

/**
 * Costo y métricas de un armado dado (por ejemplo, uno manual). Solo cuentan los jugadores
 * de `players` que aparecen en `a` o en `b`.
 */
export function evaluateSplit(
  players: readonly BalancerPlayer[],
  a: readonly string[],
  b: readonly string[],
  options: BalancerOptions = {},
): { cost: number; metrics: SplitMetrics } {
  const inA = new Set(a);
  const inB = new Set(b);
  const present = players.filter((p) => inA.has(p.id) || inB.has(p.id));
  const ctx = prepareContext(present, options);
  const side = Uint8Array.from(present, (p) => (inA.has(p.id) ? 0 : 1));
  return { cost: costOf(aggregate(side, ctx), ctx), metrics: computeMetrics(side, ctx) };
}
