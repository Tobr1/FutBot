/**
 * Temporadas como rangos de fechas locales (D-009): un partido pertenece a la
 * temporada cuyo rango contiene su fecha en la zona horaria del grupo.
 * Puro: "hoy" llega por parámetro.
 */

import { addDays, isoToZoned, isValidDateIso, zonedDateTimeToIso } from "@/domain/matches/datetime";

export interface SeasonLike {
  id: string;
  name: string;
  /** YYYY-MM-DD (incluido). */
  starts_on: string;
  /** YYYY-MM-DD (incluido) o null si sigue abierta. */
  ends_on: string | null;
}

/** Rango de fechas locales (ambos extremos incluidos); null = sin límite. */
export interface DateRange {
  from: string | null;
  to: string | null;
}

export const ALL_TIME: DateRange = { from: null, to: null };

/** Valor del filtro de temporada para "todas" (histórico). */
export const ALL_SEASONS = "todas";

export function seasonRange(season: SeasonLike | null): DateRange {
  return season ? { from: season.starts_on, to: season.ends_on } : ALL_TIME;
}

export function inDateRange(localDate: string, range: DateRange): boolean {
  if (range.from && localDate < range.from) return false;
  if (range.to && localDate > range.to) return false;
  return true;
}

/** El instante cae dentro del rango según su fecha local en la zona del grupo. */
export function instantInRange(iso: string, range: DateRange, timeZone: string): boolean {
  if (!range.from && !range.to) return true;
  return inDateRange(isoToZoned(iso, timeZone).date, range);
}

/**
 * Límites en UTC para consultar por `scheduled_at`: desde el inicio del
 * primer día (incluido) hasta el inicio del día siguiente al último (excluido).
 */
export function rangeToInstants(range: DateRange, timeZone: string): { fromIso: string | null; toIsoExclusive: string | null } {
  return {
    fromIso: range.from && isValidDateIso(range.from) ? zonedDateTimeToIso(range.from, "00:00", timeZone) : null,
    toIsoExclusive: range.to && isValidDateIso(range.to) ? zonedDateTimeToIso(addDays(range.to, 1), "00:00", timeZone) : null,
  };
}

/**
 * Temporada actual: la que contiene hoy; si ninguna, la abierta más reciente
 * que ya empezó; si no, la más reciente. null sin temporadas.
 */
export function currentSeason<T extends SeasonLike>(seasons: readonly T[], today: string): T | null {
  const byStartDesc = [...seasons].sort((a, b) => (a.starts_on < b.starts_on ? 1 : a.starts_on > b.starts_on ? -1 : 0));
  return (
    byStartDesc.find((s) => inDateRange(today, seasonRange(s))) ??
    byStartDesc.find((s) => !s.ends_on && s.starts_on <= today) ??
    byStartDesc[0] ??
    null
  );
}

export interface SeasonSelection<T extends SeasonLike> {
  /** null = histórico completo. */
  season: T | null;
  range: DateRange;
  /** Valor del filtro para la URL (id o "todas"). */
  value: string;
}

/** Interpreta `?temporada=`: un id existente, "todas", o por defecto la actual. */
export function resolveSeason<T extends SeasonLike>(
  seasons: readonly T[],
  param: string | string[] | undefined,
  today: string,
): SeasonSelection<T> {
  const value = Array.isArray(param) ? param[0] : param;
  if (value === ALL_SEASONS) return { season: null, range: ALL_TIME, value: ALL_SEASONS };
  const picked = (value && seasons.find((s) => s.id === value)) || currentSeason(seasons, today);
  return picked
    ? { season: picked, range: seasonRange(picked), value: picked.id }
    : { season: null, range: ALL_TIME, value: ALL_SEASONS };
}
