/**
 * Búsqueda exhaustiva (ANALISIS §7.3): recorre todas las particiones con el jugador 0 en el
 * equipo "máscara" (cada partición se evalúa una sola vez, sin espejos). Para cantidad impar se
 * recorren los dos tamaños posibles de ese equipo. Las restricciones se verifican con operaciones
 * de bits antes de calcular el costo, y las sumas por equipo salen de dos tablas precalculadas
 * (mitad baja y mitad alta de la máscara), así cada partición cuesta ~20 lecturas.
 * Las combinaciones de tamaño fijo se enumeran con el truco de Gosper.
 */
import { type CostContext, costOf, NF } from "./cost";
import { type IndexedConstraints, satisfies, teamSizes } from "./constraints";
import { popcount, TopK } from "./topk";

/** Las máscaras son enteros de 32 bits con signo: más jugadores no entran. */
export const MAX_EXHAUSTIVE_PLAYERS = 30;

export interface SearchOutput {
  /** Asignaciones (0 = A, 1 = B) ordenadas por costo. */
  solutions: Array<{ side: Uint8Array; cost: number }>;
  evaluated: number;
}

/** table[m·NF + f] = suma de la característica f de los jugadores offset+bit para cada bit en 1 de m. */
function buildTable(ctx: CostContext, offset: number, bits: number): Float64Array {
  const size = 1 << bits;
  const table = new Float64Array(size * NF);
  for (let m = 1; m < size; m++) {
    const low = 31 - Math.clz32(m & -m);
    const rest = m & (m - 1);
    const row = (offset + low) * NF;
    for (let f = 0; f < NF; f++) table[m * NF + f] = table[rest * NF + f] + ctx.features[row + f];
  }
  return table;
}

export function searchExhaustive(
  ctx: CostContext,
  cons: IndexedConstraints,
  topK: number,
  minDiff: number,
): SearchOutput {
  const n = ctx.n;
  if (n > MAX_EXHAUSTIVE_PLAYERS) throw new RangeError(`La búsqueda exhaustiva admite hasta ${MAX_EXHAUSTIVE_PLAYERS} jugadores.`);

  const loBits = Math.ceil(n / 2);
  const loMask = (1 << loBits) - 1;
  const lo = buildTable(ctx, 0, loBits);
  const hi = buildTable(ctx, loBits, n - loBits);

  let pinA = 0;
  let pinB = 0;
  for (let i = 0; i < n; i++) {
    if (cons.pinned[i] === 0) pinA |= 1 << i;
    else if (cons.pinned[i] === 1) pinB |= 1 << i;
  }
  const hasPins = cons.hasPins;
  const tI = Int32Array.from(cons.together, ([i]) => i);
  const tJ = Int32Array.from(cons.together, ([, j]) => j);
  const aI = Int32Array.from(cons.apart, ([i]) => i);
  const aJ = Int32Array.from(cons.apart, ([, j]) => j);
  const nTogether = tI.length;
  const nApart = aI.length;

  const top = new TopK<number>(topK, minDiff, (x, y) => {
    const h = popcount(x ^ y);
    return Math.min(h, n - h);
  });
  const agg = new Float64Array(NF);
  let evaluated = 0;

  const [small, big] = teamSizes(n);
  const limit = 2 ** (n - 1);
  for (const k of small === big ? [small] : [small, big]) {
    // Se eligen k − 1 compañeros del jugador 0 entre los otros n − 1.
    const r = k - 1;
    let sub = r === 0 ? 0 : 2 ** r - 1;
    while (sub < limit) {
      const mask = (sub * 2 + 1) | 0;
      let ok = true;
      if (hasPins) {
        const asA = (pinA & ~mask) === 0 && (pinB & mask) === 0;
        const asB = (pinB & ~mask) === 0 && (pinA & mask) === 0;
        ok = asA || asB;
      }
      for (let c = 0; ok && c < nTogether; c++) ok = (((mask >>> tI[c]) ^ (mask >>> tJ[c])) & 1) === 0;
      for (let c = 0; ok && c < nApart; c++) ok = (((mask >>> aI[c]) ^ (mask >>> aJ[c])) & 1) === 1;

      if (ok) {
        const l = (mask & loMask) * NF;
        const h = (mask >>> loBits) * NF;
        for (let f = 0; f < NF; f++) agg[f] = lo[l + f] + hi[h + f];
        const cost = costOf(agg, ctx);
        evaluated++;
        if (cost < top.threshold) top.offer(mask, cost);
      }

      if (r === 0) break;
      // Gosper: siguiente entero con la misma cantidad de bits en 1.
      const c = sub & -sub;
      const next = sub + c;
      sub = (((next ^ sub) >>> 2) / c) | next;
    }
  }

  const solutions = top.result().map(({ key, cost }) => {
    const side = new Uint8Array(n);
    for (let i = 0; i < n; i++) side[i] = (key >>> i) & 1 ? 0 : 1;
    // Con jugadores fijados la orientación importa: si no cumple así, va al revés.
    if (hasPins && !satisfies(side, cons)) for (let i = 0; i < n; i++) side[i] ^= 1;
    return { side, cost };
  });
  return { solutions, evaluated };
}
