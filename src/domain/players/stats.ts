/**
 * Métricas derivadas de las estadísticas de un jugador (puras, sin IO).
 */

export interface MatchRecord {
  matches: number;
  wins: number;
  draws: number;
}

/**
 * Efectividad en porcentaje entero: victorias más medio punto por empate,
 * sobre partidos jugados. `null` cuando todavía no jugó (se muestra "—").
 */
export function effectiveness({ matches, wins, draws }: MatchRecord): number | null {
  if (!(matches > 0)) return null;
  return Math.round(((wins + draws * 0.5) / matches) * 100);
}
