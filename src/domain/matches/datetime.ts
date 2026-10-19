/**
 * Fechas de partidos. La base guarda `timestamptz` (un instante); la UI
 * trabaja con la fecha y la hora locales de la zona horaria del grupo
 * (`groups.timezone`). Todo es puro: el "ahora" siempre llega por parámetro.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"] as const;
export const WEEKDAYS_LONG = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;
export const MONTHS_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"] as const;

/** "2026-10-25" válido (incluye años bisiestos y días por mes). */
export function isValidDateIso(value: string): boolean {
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** "22:00" válido (24 h). */
export function isValidTime(value: string): boolean {
  return TIME_RE.test(value);
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatterCache.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatterCache.set(timeZone, formatter);
  }
  return formatter;
}

function zonedParts(utcMs: number, timeZone: string): ZonedParts {
  const parts: Record<string, string> = {};
  for (const part of formatterFor(timeZone).formatToParts(new Date(utcMs))) parts[part.type] = part.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Diferencia (ms) entre la hora local de la zona y UTC en ese instante. */
function offsetMs(utcMs: number, timeZone: string): number {
  const p = zonedParts(utcMs, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - (utcMs - (((utcMs % 1000) + 1000) % 1000));
}

/**
 * Fecha + hora locales de una zona horaria → instante ISO (UTC).
 * Corrige dos veces el desfasaje para respetar cambios de horario de verano.
 */
export function zonedDateTimeToIso(date: string, time: string, timeZone: string): string {
  if (!isValidDateIso(date)) throw new RangeError(`Fecha inválida: ${date}`);
  if (!isValidTime(time)) throw new RangeError(`Hora inválida: ${time}`);
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  const naive = Date.UTC(year, month - 1, day, hour, minute);
  let utc = naive - offsetMs(naive, timeZone);
  utc = naive - offsetMs(utc, timeZone);
  return new Date(utc).toISOString();
}

export interface LocalDateTime {
  /** YYYY-MM-DD en la zona del grupo. */
  date: string;
  /** HH:MM (24 h). */
  time: string;
  /** 0 = domingo … 6 = sábado. */
  weekday: number;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** Instante ISO → fecha y hora locales de la zona horaria. */
export function isoToZoned(iso: string, timeZone: string): LocalDateTime {
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) throw new RangeError(`Instante inválido: ${iso}`);
  const p = zonedParts(ms, timeZone);
  return {
    date: `${p.year}-${pad(p.month)}-${pad(p.day)}`,
    time: `${pad(p.hour)}:${pad(p.minute)}`,
    weekday: new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay(),
  };
}

/** Día de la semana (0 = domingo) de una fecha ISO. */
export function weekdayOf(date: string): number {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

/** Suma (o resta) días a una fecha ISO. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** Días entre dos fechas ISO (b − a). */
export function daysBetween(a: string, b: string): number {
  const toMs = (value: string) => {
    const [year, month, day] = value.split("-").map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((toMs(b) - toMs(a)) / 86_400_000);
}

/** "Sáb 25/10 · 22:00". */
export function formatMatchDay(iso: string, timeZone: string): string {
  const local = isoToZoned(iso, timeZone);
  const [, month, day] = local.date.split("-");
  return `${WEEKDAYS_SHORT[local.weekday]} ${day}/${month} · ${local.time}`;
}

/** "Sáb 25/10" (sin hora). */
export function formatMatchDate(iso: string, timeZone: string): string {
  const local = isoToZoned(iso, timeZone);
  const [, month, day] = local.date.split("-");
  return `${WEEKDAYS_SHORT[local.weekday]} ${day}/${month}`;
}

export interface DateChipParts {
  weekday: string;
  day: string;
  month: string;
  time: string;
  date: string;
}

/** Piezas para el chip de fecha de las tarjetas: SÁB · 25 · OCT · 22:00. */
export function dateChipParts(iso: string, timeZone: string): DateChipParts {
  const local = isoToZoned(iso, timeZone);
  const [, month, day] = local.date.split("-").map(Number);
  return {
    weekday: WEEKDAYS_SHORT[local.weekday],
    day: String(day),
    month: MONTHS_SHORT[month - 1],
    time: local.time,
    date: local.date,
  };
}

/** "Hoy", "Mañana" o "Ayer" según la fecha local de hoy; null para el resto. */
export function relativeDayLabel(date: string, today: string): "Hoy" | "Mañana" | "Ayer" | null {
  const diff = daysBetween(today, date);
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff === -1) return "Ayer";
  return null;
}

export type DayHintValue = "lunes" | "martes" | "miércoles" | "jueves" | "viernes" | "sábado" | "domingo" | "hoy" | "mañana";

/**
 * Pista de día de una lista de WhatsApp ("sábado", "mañana") → fecha concreta.
 * Un día de semana es la próxima ocurrencia, contando hoy.
 */
export function resolveDayHint(hint: DayHintValue, today: string): string {
  if (hint === "hoy") return today;
  if (hint === "mañana") return addDays(today, 1);
  const target = WEEKDAYS_LONG.indexOf(hint);
  const delta = (target - weekdayOf(today) + 7) % 7;
  return addDays(today, delta);
}

/**
 * Marca de tiempo corta para el registro de cambios: "Hoy 14:32",
 * "Ayer 21:10", "Lun 13/10 · 18:00" o "13/10/2025" en otro año.
 */
export function formatStamp(iso: string, timeZone: string, now: Date): string {
  const local = isoToZoned(iso, timeZone);
  const today = isoToZoned(now.toISOString(), timeZone).date;
  const relative = relativeDayLabel(local.date, today);
  if (relative === "Hoy" || relative === "Ayer") return `${relative} ${local.time}`;
  const [year, month, day] = local.date.split("-");
  if (year !== today.slice(0, 4)) return `${day}/${month}/${year}`;
  return `${WEEKDAYS_SHORT[local.weekday]} ${day}/${month} · ${local.time}`;
}
