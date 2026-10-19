import { DEFAULT_TIME_ZONE } from "@/lib/format";

/**
 * Nombre corto de la zona horaria del grupo para aclarar las horas, o
 * undefined si es la de Buenos Aires (la habitual, no hace falta aclararla).
 */
export function timeZoneLabel(timeZone: string): string | undefined {
  if (timeZone === DEFAULT_TIME_ZONE) return undefined;
  return timeZone.split("/").pop()?.replaceAll("_", " ") ?? timeZone;
}
