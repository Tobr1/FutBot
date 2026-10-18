/**
 * Tono estable (0–359) derivado de un nombre, para que cada jugador o grupo
 * tenga "su" color sin guardarlo en la base. Mismo algoritmo que UserAvatar.
 */
export function hueFor(name: string): number {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash % 360;
}
