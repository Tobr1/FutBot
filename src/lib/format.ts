/** Formatos de fecha en español rioplatense. */

export const DEFAULT_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function formatDate(value: string | Date, timeZone = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone }).format(
    typeof value === "string" ? new Date(value) : value,
  );
}

export function formatDateTime(value: string | Date, timeZone = DEFAULT_TIME_ZONE): string {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone }).format(
    typeof value === "string" ? new Date(value) : value,
  );
}

/** Fecha ISO (YYYY-MM-DD) tal cual, sin corrimiento por zona horaria. */
export function formatIsoDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}

/** Fecha local de hoy (YYYY-MM-DD) en la zona horaria del grupo. */
export function todayIso(timeZone = DEFAULT_TIME_ZONE, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
