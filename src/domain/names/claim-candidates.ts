/**
 * Sugerencia de ficha en "Mi ficha": compara el nombre de la cuenta con el
 * apodo y el nombre completo de las fichas sin vincular y las ordena por
 * parecido. Pura y determinista (se usa en el servidor).
 */
import { normalizeName } from "./normalize";

export interface ClaimCandidateInput {
  id: string;
  nickname: string;
  fullName: string | null;
}

export interface ClaimCandidate {
  id: string;
  score: number;
}

/** Puntaje por token del nombre de la cuenta (se queda con la mejor coincidencia). */
export const CLAIM_SCORE = { exact: 3, prefix: 2, initial: 1 } as const;

/** Largo mínimo del prefijo compartido para contar como coincidencia parcial. */
const MIN_PREFIX = 3;

/** Conectores que no identifican a nadie ("Juan de la Cruz"). */
const STOPWORDS = new Set(["de", "del", "la", "las", "los", "el", "y", "da", "do", "dos", "van", "von"]);

function tokens(value: string | null | undefined): string[] {
  const normalized = normalizeName(value);
  if (!normalized) return [];
  return normalized.split(" ").filter((token) => !STOPWORDS.has(token));
}

/** Mejor puntaje de un token de la cuenta contra los tokens de una ficha. */
function tokenScore(token: string, candidates: string[]): number {
  let best = 0;
  for (const other of candidates) {
    if (token === other) return CLAIM_SCORE.exact;
    const [short, long] = token.length <= other.length ? [token, other] : [other, token];
    if (short.length >= MIN_PREFIX && long.startsWith(short)) {
      best = Math.max(best, CLAIM_SCORE.prefix);
    } else if (short.length === 1 && long.startsWith(short)) {
      // Una inicial suelta ("J. Pérez") que coincide con la primera letra.
      best = Math.max(best, CLAIM_SCORE.initial);
    }
  }
  return best;
}

/**
 * Ordena las fichas por parecido con `displayName`: por cada palabra del
 * nombre suma 3 si coincide exacta con alguna del apodo o del nombre completo,
 * 2 si una es prefijo de la otra (3+ letras) y 1 si es una inicial que
 * coincide. Ignora mayúsculas, acentos y signos. Devuelve solo puntajes > 0,
 * de mayor a menor (los empates conservan el orden de entrada).
 */
export function rankClaimCandidates(displayName: string, players: readonly ClaimCandidateInput[]): ClaimCandidate[] {
  const nameTokens = [...new Set(tokens(displayName))];
  if (nameTokens.length === 0) return [];

  return players
    .map((player) => {
      const playerTokens = [...new Set([...tokens(player.nickname), ...tokens(player.fullName)])];
      const score = nameTokens.reduce((sum, token) => sum + tokenScore(token, playerTokens), 0);
      return { id: player.id, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score);
}
