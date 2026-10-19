/**
 * Cruce de una lista importada con el plantel del grupo. Conservador: solo
 * resuelve lo inequívoco; lo dudoso queda "ambiguous" para que el admin
 * confirme y nunca se crean fichas duplicadas sin preguntar.
 */
import { normalizeName } from "@/domain/names/normalize";
import type { ParsedEntry } from "./parse";

export interface RosterPlayer {
  id: string;
  nickname: string;
  fullName?: string | null;
  aliases?: string[];
  isActive?: boolean;
}

export type MatchStatus = "matched" | "ambiguous" | "new";
export type MatchReason = "exact" | "alias" | "full_name" | "prefix" | "fuzzy";

export interface MatchCandidate {
  id: string;
  nickname: string;
  score: number;
  reason: MatchReason;
}

export type MatchedEntry = ParsedEntry & {
  status: MatchStatus;
  playerId: string | null;
  candidates: MatchCandidate[];
};

/** Puntaje mínimo para resolver sin confirmación un candidato único que no es exacto. */
export const AUTO_MATCH_SCORE = 0.92;
/** Similitud mínima (1 - distancia / largo) para sugerir un candidato por parecido. */
export const FUZZY_MIN_SIMILARITY = 0.75;

const MIN_PREFIX = 3;
const MAX_CANDIDATES = 5;
/** Primer nombre del nombre completo: único en el plantel vs compartido. */
const FIRST_NAME_SCORE = { unique: 0.95, shared: 0.85 } as const;
/** Coincidencia con otra palabra del apodo o del nombre completo ("Pérez", "Ruso"). */
const TOKEN_SCORE = 0.85;
/** Penalización (solo para ordenar) de las fichas inactivas. */
const INACTIVE_PENALTY = 0.05;
const REASON_ORDER: MatchReason[] = ["exact", "alias", "full_name", "prefix", "fuzzy"];

/**
 * Distancia de Damerau-Levenshtein (variante "optimal string alignment"):
 * inserciones, borrados, sustituciones y transposiciones de vecinos.
 */
export function damerauLevenshtein(a: string, b: string): number {
  const s = [...a];
  const t = [...b];
  if (s.length === 0) return t.length;
  if (t.length === 0) return s.length;

  const d: number[][] = Array.from({ length: s.length + 1 }, (_, i) =>
    Array.from({ length: t.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= s.length; i++) {
    for (let j = 1; j <= t.length; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && s[i - 1] === t[j - 2] && s[i - 2] === t[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[s.length][t.length];
}

/** 1 - distancia / largo mayor, entre 0 y 1. */
export function similarity(a: string, b: string): number {
  const longest = Math.max([...a].length, [...b].length);
  if (longest === 0) return 1;
  return 1 - damerauLevenshtein(a, b) / longest;
}

interface IndexedPlayer {
  player: RosterPlayer;
  active: boolean;
  nickname: string | null;
  aliases: string[];
  fullName: string | null;
  firstName: string | null;
  nicknameTokens: string[];
  fullNameTokens: string[];
}

function indexRoster(roster: readonly RosterPlayer[]): IndexedPlayer[] {
  return roster.map((player) => {
    const nickname = normalizeName(player.nickname);
    const fullName = normalizeName(player.fullName);
    const aliases = (player.aliases ?? []).map((alias) => normalizeName(alias)).filter((a): a is string => !!a);
    return {
      player,
      active: player.isActive !== false,
      nickname,
      aliases,
      fullName,
      firstName: fullName ? fullName.split(" ")[0] : null,
      nicknameTokens: nickname ? nickname.split(" ") : [],
      fullNameTokens: fullName ? fullName.split(" ") : [],
    };
  });
}

type Score = { score: number; reason: MatchReason };

function better(a: Score | null, b: Score | null): Score | null {
  if (!a) return b;
  if (!b) return a;
  if (a.score !== b.score) return a.score > b.score ? a : b;
  return REASON_ORDER.indexOf(a.reason) <= REASON_ORDER.indexOf(b.reason) ? a : b;
}

function scorePlayer(name: string, indexed: IndexedPlayer, firstNameCounts: Map<string, number>): Score | null {
  if (indexed.nickname === name) return { score: 1, reason: "exact" };
  if (indexed.aliases.includes(name)) return { score: 1, reason: "alias" };
  if (indexed.fullName === name) return { score: 1, reason: "full_name" };

  let best: Score | null = null;
  if (!name.includes(" ")) {
    if (indexed.firstName === name) {
      const unique = firstNameCounts.get(name) === 1;
      best = { score: unique ? FIRST_NAME_SCORE.unique : FIRST_NAME_SCORE.shared, reason: "full_name" };
    } else if (indexed.fullNameTokens.includes(name)) {
      // Apellido u otra palabra del nombre completo: siempre se confirma.
      best = { score: TOKEN_SCORE, reason: "full_name" };
    } else if (indexed.nicknameTokens.includes(name)) {
      best = { score: TOKEN_SCORE, reason: "prefix" };
    }
  }

  const wholeKeys = [indexed.nickname, ...indexed.aliases, indexed.fullName].filter((k): k is string => !!k);
  const keys = [...new Set([...wholeKeys, ...indexed.nicknameTokens, ...indexed.fullNameTokens])];

  for (const key of keys) {
    if (key === name) continue;
    const [short, long] = key.length <= name.length ? [key, name] : [name, key];
    if (short.length >= MIN_PREFIX && long.startsWith(short)) {
      best = better(best, { score: 0.6 + 0.3 * (short.length / long.length), reason: "prefix" });
    }
  }

  const fuzzyKeys = name.includes(" ") ? wholeKeys : keys;
  for (const key of fuzzyKeys) {
    if (key === name || Math.min(key.length, name.length) < MIN_PREFIX) continue;
    const distance = damerauLevenshtein(name, key);
    const sim = similarity(name, key);
    if (sim >= FUZZY_MIN_SIMILARITY || distance === 1) {
      best = better(best, { score: sim, reason: "fuzzy" });
    }
  }
  return best;
}

function rank(candidate: MatchCandidate, active: boolean): number {
  return candidate.score - (active ? 0 : INACTIVE_PENALTY);
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/**
 * Cruza cada entrada con el plantel. "matched" solo si hay un único candidato
 * exacto (apodo, alias o nombre completo) o un único candidato con puntaje
 * ≥ AUTO_MATCH_SCORE (por ejemplo, el primer nombre del nombre completo cuando
 * nadie más lo comparte). Con candidatos dudosos queda "ambiguous"; sin
 * candidatos, "new". Una ficha se asigna una sola vez: primero se resuelven
 * las coincidencias exactas (en orden de lista) y después las fuertes; la
 * entrada que llegue a una ficha ya tomada queda "ambiguous".
 */
export function matchLineup(entries: readonly ParsedEntry[], roster: readonly RosterPlayer[]): MatchedEntry[] {
  const indexed = indexRoster(roster);
  const firstNameCounts = new Map<string, number>();
  for (const p of indexed) {
    if (p.firstName) firstNameCounts.set(p.firstName, (firstNameCounts.get(p.firstName) ?? 0) + 1);
  }
  const activeById = new Map(indexed.map((p) => [p.player.id, p.active]));

  const results: MatchedEntry[] = entries.map((entry) => {
    const name = normalizeName(entry.name);
    const candidates: MatchCandidate[] = [];
    if (name) {
      for (const p of indexed) {
        const score = scorePlayer(name, p, firstNameCounts);
        if (!score) continue;
        candidates.push({ id: p.player.id, nickname: p.player.nickname, score: round(score.score), reason: score.reason });
      }
    }
    candidates.sort(
      (a, b) =>
        rank(b, activeById.get(b.id) ?? true) - rank(a, activeById.get(a.id) ?? true) ||
        a.nickname.localeCompare(b.nickname, "es"),
    );
    return {
      ...entry,
      status: candidates.length > 0 ? "ambiguous" : "new",
      playerId: null,
      candidates: candidates.slice(0, MAX_CANDIDATES),
    };
  });

  const used = new Set<string>();
  const assign = (result: MatchedEntry, id: string) => {
    if (used.has(id)) return;
    used.add(id);
    result.status = "matched";
    result.playerId = id;
  };

  // 1) Coincidencias exactas e inequívocas.
  for (const result of results) {
    const exact = result.candidates.filter((c) => c.score === 1);
    if (exact.length === 1) assign(result, exact[0].id);
  }
  // 2) Un único candidato fuerte, si la ficha sigue libre.
  for (const result of results) {
    if (result.status !== "ambiguous" || result.candidates.length !== 1) continue;
    const [only] = result.candidates;
    if (only.score < 1 && only.score >= AUTO_MATCH_SCORE) assign(result, only.id);
  }
  return results;
}

export interface LineupSummary {
  matched: number;
  ambiguous: number;
  new: number;
  /** Entradas en la sección de suplentes (se cuentan también en su estado). */
  reserve: number;
}

export function summarize(matched: readonly MatchedEntry[]): LineupSummary {
  const summary: LineupSummary = { matched: 0, ambiguous: 0, new: 0, reserve: 0 };
  for (const entry of matched) {
    summary[entry.status] += 1;
    if (entry.section === "reserve") summary.reserve += 1;
  }
  return summary;
}
