/**
 * Explicación corta de un armado, generada a partir de sus métricas (ANALISIS §7.4).
 * Textos en español rioplatense con números en formato es-AR (coma decimal).
 */
import { joinNames } from "./constraints";
import type { BalancerPlayer, Constraints, Position, Side, TeamSplit } from "./types";

/** Desde esta incertidumbre σ un jugador se considera nuevo (nivel provisional). */
export const PROVISIONAL_SIGMA = 1.5;

export interface ExplainOptions {
  provisionalSigma?: number;
  /** Nombres de los equipos para los textos. Default "A" y "B". */
  teamNames?: Record<Side, string>;
}

const decimal = new Intl.NumberFormat("es-AR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 0,3 · 1,8 · 12,0 (sin signo negativo para el cero redondeado). */
export function formatDecimal(value: number): string {
  const text = decimal.format(Math.abs(value) < 0.05 ? 0 : value);
  return text.replace(/ /g, " ");
}

const POSITION_PLURAL: Array<[Position, string]> = [
  ["defender", "Defensas"],
  ["midfielder", "Mediocampistas"],
  ["forward", "Delanteros"],
];

export function explainSplit(
  split: TeamSplit,
  players: readonly BalancerPlayer[],
  constraints: Constraints = {},
  options: ExplainOptions = {},
): string[] {
  const m = split.metrics;
  const names = options.teamNames ?? { a: "A", b: "B" };
  const threshold = options.provisionalSigma ?? PROVISIONAL_SIGMA;
  const byId = new Map(players.map((p) => [p.id, p]));
  const sideOf = new Map<string, Side>([...split.a.map((id) => [id, "a"] as const), ...split.b.map((id) => [id, "b"] as const)]);
  const team = (side: Side) => `el equipo ${names[side]}`;
  const nameOf = (id: string) => byId.get(id)?.name ?? id;
  const inTeam = (side: Side) => (side === "a" ? split.a : split.b).map((id) => byId.get(id)).filter((p) => p !== undefined);
  const lines: string[] = [];

  lines.push(`Diferencia de nivel: ${formatDecimal(m.levelDiff)} puntos (${formatDecimal(m.levelDiffPct)} %).`);
  if (split.a.length !== split.b.length) {
    const big = Math.max(split.a.length, split.b.length);
    const small = Math.min(split.a.length, split.b.length);
    lines.push(`Juegan ${big} contra ${small}: el equipo con uno menos tiene jugadores algo mejores.`);
  }

  // Arqueros (posición principal).
  const gk = m.gkA + m.gkB;
  if (gk === 0) lines.push("No hay arqueros naturales.");
  else if (gk === 1) lines.push(`Un solo arquero natural: juega en ${team(m.gkA === 1 ? "a" : "b")}.`);
  else if (m.gkA === 1 && m.gkB === 1) lines.push("Un arquero por equipo.");
  else if (m.gkA === 0 || m.gkB === 0) lines.push(`Los ${gk} arqueros quedaron en el mismo equipo.`);
  else lines.push(`Arqueros ${m.gkA}–${m.gkB}.`);

  // Resto de las posiciones (principal) para que se lea fácil.
  const count = (side: Side, pos: Position) => inTeam(side).filter((p) => p.primary === pos).length;
  const positions = POSITION_PLURAL.map(([pos, label]) => [label, count("a", pos), count("b", pos)] as const)
    .filter(([, a, b]) => a + b > 0)
    .map(([label, a, b]) => `${label} ${a}–${b}`);
  if (positions.length) lines.push(`${positions.join(" · ")}.`);

  // Jugadores nuevos.
  const isNew = (p: BalancerPlayer) => (p.sigma ?? 0) >= threshold;
  const newA = inTeam("a").filter(isNew).length;
  const newB = inTeam("b").filter(isNew).length;
  const newTotal = newA + newB;
  if (newTotal === 2 && newA === 1) lines.push("Los 2 jugadores nuevos quedaron separados.");
  else if (newTotal >= 2 && Math.abs(newA - newB) <= 1) lines.push(`Los ${newTotal} jugadores nuevos quedaron repartidos ${newA}–${newB}.`);
  else if (newTotal >= 2) lines.push(`Jugadores nuevos: ${newA}–${newB}.`);

  // Forma reciente, solo si alguien la tiene informada.
  if (players.some((p) => (p.form ?? 0) !== 0)) {
    lines.push(`Forma reciente: diferencia de ${formatDecimal(m.formDiff)} puntos.`);
  }

  // Restricciones.
  const known = (id: string) => sideOf.has(id);
  for (const [x, y] of constraints.together ?? []) {
    if (x === y || !known(x) || !known(y)) continue;
    lines.push(
      sideOf.get(x) === sideOf.get(y)
        ? `${nameOf(x)} y ${nameOf(y)} juegan juntos (restricción).`
        : `${nameOf(x)} y ${nameOf(y)} deberían jugar juntos y quedaron separados.`,
    );
  }
  for (const [x, y] of constraints.apart ?? []) {
    if (x === y || !known(x) || !known(y)) continue;
    lines.push(
      sideOf.get(x) !== sideOf.get(y)
        ? `${nameOf(x)} y ${nameOf(y)} juegan separados (restricción).`
        : `${nameOf(x)} y ${nameOf(y)} deberían jugar separados y quedaron juntos.`,
    );
  }
  for (const side of ["a", "b"] as const) {
    const pinned = Object.entries(constraints.pinned ?? {})
      .filter(([id, s]) => s === side && known(id))
      .map(([id]) => id);
    const kept = pinned.filter((id) => sideOf.get(id) === side).map(nameOf);
    const moved = pinned.filter((id) => sideOf.get(id) !== side).map(nameOf);
    if (kept.length === 1) lines.push(`${kept[0]} quedó fijado en ${team(side)}.`);
    else if (kept.length > 1) lines.push(`${joinNames(kept)} quedaron fijados en ${team(side)}.`);
    if (moved.length) {
      const plural = moved.length > 1;
      lines.push(
        `${joinNames(moved)} ${plural ? "estaban fijados" : "estaba fijado"} en ${team(side)} y ${plural ? "quedaron" : "quedó"} en el otro.`,
      );
    }
  }

  // Variedad respecto del partido anterior.
  const changes = m.repetitionChanges;
  if (changes === 0) lines.push("Mismos equipos que el último partido.");
  else if (changes !== null) lines.push(`Equipos distintos al último partido (${changes} ${changes === 1 ? "cambio" : "cambios"}).`);

  return lines;
}
