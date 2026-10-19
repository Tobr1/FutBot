/**
 * Parser de listas de convocatoria pegadas desde WhatsApp. Puro y determinista:
 * separa encabezado (día/hora), titulares, suplentes y líneas descartadas.
 */
import type { Position } from "@/domain/players/positions";
import { normalizeName } from "@/domain/names/normalize";

export type LineupSection = "confirmed" | "reserve";
export type PositionHint = Position | null;
export type DayHint = "lunes" | "martes" | "miércoles" | "jueves" | "viernes" | "sábado" | "domingo" | "hoy" | "mañana";

export interface ParsedEntry {
  /** Línea original (sin espacios en los extremos). */
  raw: string;
  /** Nombre limpio, con las mayúsculas originales. */
  name: string;
  /** Posición 1-based dentro de las entradas aceptadas (titulares y suplentes). */
  order: number;
  section: LineupSection;
  positionHint: PositionHint;
}

export interface LineupHeader {
  raw: string | null;
  dayHint: DayHint | null;
  /** Hora en formato HH:MM. */
  timeHint: string | null;
}

export interface ParsedLineup {
  header: LineupHeader;
  entries: ParsedEntry[];
  /** Líneas descartadas: bajas, cupos vacíos, duplicados y texto que no es un nombre. */
  ignored: string[];
}

type SectionState = LineupSection | "out";

/** "[16/10 21:03] Juan: ", "16/10/26, 21:03 - Juan: ". */
const WHATSAPP_PREFIX =
  /^\[?\d{1,2}[/.-]\d{1,2}(?:[/.-]\d{2,4})?,?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[ap]\.?\s?m\.?)?\]?\s*(?:[-–]\s*)?[^:]{1,40}?:(?:\s+|$)/i;

const EMOJI =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2300}-\u{23FF}\u{2190}-\u{21FF}\u{FE0E}\u{FE0F}\u{200D}\u{20E3}\u{2122}\u{2139}\u{3030}\u{303D}]/gu;

const LEADING_EMOJI = new RegExp(`^(?:${EMOJI.source}|\\s)+`, "u");
const KEYCAP_NUMBER =/^(?:(?:[0-9]\u{FE0F}?\u{20E3})+|\u{1F51F})\s*/u;
const NUMBERED = /^\d{1,2}\s*(?:[.):\-–—°º])\s*/;
const BARE_NUMBER = /^\d{1,2}\s+(?=\S)/;
const BULLET = /^(?:[•·▪◦●○►]|[-–—>](?!\s*$)|\*(?=\s))\s*/;
const LEADING_TIME = /^\d{1,2}[:.]\d{2}\b/;
const TIME_UNIT = /^(?:hs?|hrs?|horas?)\b/i;

const OUT_MARKS = /[❌🚫✖⛔]/u;
const STRIKETHROUGH = /~[^~]+~/;
const OUT_WORDS = /\b(?:baja|bajas|no voy|no puedo|no juego|no llego|me bajo|se bajo)\b/;

const HEADER_WORDS = /\b(?:futbol|partido|cancha|lista|fecha|hs|horas|turno|vs|f5|f7|f8|f11)\b/;

const SECTION_MARKERS = new Map<string, SectionState>([
  ...["suplente", "suplentes", "suplencia", "reserva", "reservas", "lista de espera", "en espera", "espera", "banco"].map(
    (key) => [key, "reserve"] as const,
  ),
  ...["titulares", "confirmados", "lista", "convocados", "juegan", "van"].map((key) => [key, "confirmed"] as const),
  ...["baja", "bajas", "no van", "no vienen", "no pueden", "no juegan", "ausentes"].map((key) => [key, "out"] as const),
]);

const POSITION_WORDS = new Map<string, Position>([
  ...["arq", "arquero", "arco", "golero", "gk", "portero"].map((key) => [key, "goalkeeper"] as const),
  ...["def", "defensor", "defensa", "central", "lateral"].map((key) => [key, "defender"] as const),
  ...["med", "medio", "mediocampista", "volante", "mc"].map((key) => [key, "midfielder"] as const),
  ...["del", "delantero", "punta"].map((key) => [key, "forward"] as const),
]);

const TRAILING_POSITION =
  /(?:\s*[-–—/|,:]\s*|\s+)(arq|arquero|golero|gk|def|defensor|defensa|med|medio|volante|del|delantero|punta)\.?$/i;
const LEADING_POSITION = /^(arq|arquero|golero)\s*[:\-–]\s*/i;

const DAYS: Array<[string, DayHint]> = [
  ["lunes", "lunes"],
  ["martes", "martes"],
  ["miercoles", "miércoles"],
  ["jueves", "jueves"],
  ["viernes", "viernes"],
  ["sabado", "sábado"],
  ["domingo", "domingo"],
  ["hoy", "hoy"],
  ["manana", "mañana"],
];

function stripEmoji(value: string): string {
  return value.replace(EMOJI, " ");
}

function collapse(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function stripWhatsAppPrefix(line: string): string {
  return line.replace(WHATSAPP_PREFIX, "").trim();
}

/** Numeración o viñeta al principio de la línea. */
function splitMarker(text: string): { marked: boolean; rest: string } {
  const keycap = text.match(KEYCAP_NUMBER);
  if (keycap) return { marked: true, rest: text.slice(keycap[0].length) };

  // Emojis decorativos antes del número ("⚽ 5. Fran").
  const body = text.replace(LEADING_EMOJI, "");
  if (LEADING_TIME.test(body)) return { marked: false, rest: text };
  for (const pattern of [NUMBERED, BULLET]) {
    const match = body.match(pattern);
    if (match) return { marked: true, rest: body.slice(match[0].length) };
  }
  const bare = body.match(BARE_NUMBER);
  if (bare && !TIME_UNIT.test(body.slice(bare[0].length))) {
    return { marked: true, rest: body.slice(bare[0].length) };
  }
  return { marked: false, rest: text };
}

/** "Suplentes:", "*Lista de espera* (por orden)", "Banco: Pedro, Juan". */
function sectionMarker(text: string): { section: SectionState; rest: string } | null {
  const cleaned = stripEmoji(text).replace(/[*_]/g, "").replace(BULLET, "").trim();
  const colon = cleaned.indexOf(":");
  const head = colon >= 0 ? cleaned.slice(0, colon) : cleaned;
  const rest = colon >= 0 ? cleaned.slice(colon + 1).trim() : "";
  const key = normalizeName(head.replace(/\([^)]*\)/g, " "));
  const section = key ? SECTION_MARKERS.get(key) : undefined;
  return section ? { section, rest } : null;
}

function positionFrom(value: string): Position | null {
  const key = normalizeName(value);
  return key ? (POSITION_WORDS.get(key) ?? null) : null;
}

function isOut(text: string): boolean {
  if (OUT_MARKS.test(text) || STRIKETHROUGH.test(text)) return true;
  return OUT_WORDS.test(normalizeName(text) ?? "");
}

export function extractDayHint(text: string): DayHint | null {
  const tokens = new Set((normalizeName(text) ?? "").split(" "));
  // Los días de semana ganan a "mañana" ("sábado a la mañana").
  for (const [key, day] of DAYS) if (tokens.has(key)) return day;
  return null;
}

function formatTime(hours: string, minutes: string | undefined): string | null {
  const h = Number(hours);
  const m = minutes === undefined ? 0 : Number(minutes);
  if (h > 23 || m > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** "22 hs" → "22:00", "21.30" → "21:30", "a las 9" → "09:00". */
export function extractTimeHint(text: string): string | null {
  const lower = text.toLowerCase();
  const patterns = [
    /\b(\d{1,2})(?:[:.](\d{2}))?\s*(?:hs|hrs|horas|h)\b/,
    /\b(\d{1,2}):(\d{2})\b/,
    /\b(\d{1,2})\.(\d{2})\b(?![./]\d)/,
    /\ba las (\d{1,2})\b/,
  ];
  for (const pattern of patterns) {
    const match = lower.match(pattern);
    if (!match) continue;
    const time = formatTime(match[1], match[2]);
    if (time) return time;
  }
  return null;
}

function looksLikeHeader(text: string): boolean {
  if (extractDayHint(text) || extractTimeHint(text)) return true;
  const normalized = normalizeName(stripEmoji(text)) ?? "";
  return HEADER_WORDS.test(normalized) || normalized.split(" ").length > 4;
}

function looksLikeName(name: string): boolean {
  if (name.length > 32 || name.split(" ").length > 4) return false;
  if (/\d{3,}/.test(name) || extractTimeHint(name)) return false;
  return /\p{L}/u.test(name);
}

/** Limpia una entrada: emojis, formato, aclaraciones entre paréntesis y posición. */
function cleanEntry(text: string): { name: string; positionHint: PositionHint } {
  let positionHint: PositionHint = text.includes("🧤") ? "goalkeeper" : null;

  let value = text.replace(/[([]([^)\]]*)[)\]]/g, (_, inner: string) => {
    positionHint = positionFrom(inner) ?? positionHint;
    return " ";
  });
  value = collapse(stripEmoji(value).replace(/[*_~]/g, " "));
  value = value.replace(/^[\s\-–—.:)·•,]+/, "");

  const leading = value.match(LEADING_POSITION);
  if (leading) {
    positionHint = positionFrom(leading[1]) ?? positionHint;
    value = value.slice(leading[0].length);
  }

  value = value.replace(/\s*\+\s*\d+\s*$/, "");
  const trailing = value.match(TRAILING_POSITION);
  if (trailing && /\p{L}/u.test(value.slice(0, trailing.index))) {
    positionHint = positionFrom(trailing[1]) ?? positionHint;
    value = value.slice(0, trailing.index);
  }

  const name = collapse(value.replace(/^[\s\-–—.,:;!?/|+]+|[\s\-–—.,:;!?/|+]+$/g, ""));
  return { name, positionHint };
}

/**
 * Interpreta una lista pegada desde WhatsApp. Reconoce numeraciones ("1.",
 * "1)", "1 -", "01.", "1️⃣"), viñetas, emojis, aclaraciones de posición
 * ("(arq)", "def"), secciones de suplentes y de bajas, cupos vacíos, prefijos
 * de chat exportado y nombres repetidos (se queda con el primero).
 */
export function parseLineup(text: string): ParsedLineup {
  const lines = text.split(/\r?\n/).map((line) => ({ raw: line.trim(), text: stripWhatsAppPrefix(line.trim()) }));
  const hasMarkedEntries = lines.some(
    (line) => line.text && !sectionMarker(line.text) && splitMarker(line.text).marked,
  );

  const headerLines: string[] = [];
  const entries: ParsedEntry[] = [];
  const ignored: string[] = [];
  const seen = new Set<string>();
  let section: SectionState = "confirmed";
  let started = false;

  const addEntry = (raw: string, body: string, marked: boolean, target: SectionState) => {
    if (target === "out" || isOut(body)) {
      ignored.push(raw);
      return;
    }
    const { name, positionHint } = cleanEntry(body);
    const key = normalizeName(name);
    if (!key || (!marked && !looksLikeName(name)) || seen.has(key)) {
      ignored.push(raw);
      return;
    }
    seen.add(key);
    entries.push({ raw, name, order: entries.length + 1, section: target, positionHint });
  };

  for (const { raw, text: line } of lines) {
    if (!line) continue;

    const marker = sectionMarker(line);
    if (marker) {
      started = true;
      if (marker.rest) {
        // "Baja: Juan" descarta solo esa línea; "Suplentes: Pedro, Juan" cambia de sección.
        if (marker.section !== "out") section = marker.section;
        for (const piece of marker.rest.split(/,|\s+y\s+/)) {
          if (piece.trim()) addEntry(raw, piece.trim(), true, marker.section);
        }
      } else {
        section = marker.section;
      }
      continue;
    }

    const { marked, rest } = splitMarker(line);
    if (!marked && !started && (hasMarkedEntries || looksLikeHeader(line))) {
      headerLines.push(line);
      continue;
    }
    started = true;
    addEntry(raw, rest, marked, section);
  }

  const headerRaw = headerLines.length > 0 ? headerLines.join("\n") : null;
  return {
    header: {
      raw: headerRaw,
      dayHint: headerRaw ? extractDayHint(headerRaw) : null,
      timeHint: headerRaw ? extractTimeHint(headerRaw) : null,
    },
    entries,
    ignored,
  };
}
