/**
 * Normalización de nombres idéntica a public.normalize_name() en la base:
 * minúsculas, sin acentos, sin signos y con espacios simples.
 * Se usa para detectar duplicados antes de enviar y para el importador de listas.
 */

const FROM = "áàäâãåéèëêíìïîóòöôõúùüûñç";
const TO = "aaaaaaeeeeiiiiooooouuuunc";
const MAP = new Map([...FROM].map((char, i) => [char, TO[i]]));

export function normalizeName(value: string | null | undefined): string | null {
  if (!value) return null;
  const translated = [...value.toLowerCase()].map((char) => MAP.get(char) ?? char).join("");
  const cleaned = translated.replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.length > 0 ? cleaned : null;
}

export function slugify(value: string): string | null {
  const normalized = normalizeName(value);
  return normalized ? normalized.replaceAll(" ", "-") : null;
}

/** Iniciales para avatares: "Juan Cruz" → "JC", "Brito" → "BR". */
export function initials(value: string): string {
  const words = (normalizeName(value) ?? "").split(" ").filter(Boolean);
  const source = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (source.length >= 2) return (source[0][0] + source[1][0]).toUpperCase();
  return source[0].slice(0, 2).toUpperCase();
}
