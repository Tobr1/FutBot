/** Token de invitación: 64 caracteres hexadecimales en minúscula. */
export const TOKEN_PATTERN = /^[0-9a-f]{64}$/;

/** Una tira de 64 hex que no forma parte de una tira hex más larga. */
const TOKEN_IN_TEXT = /(?<![0-9a-f])[0-9a-f]{64}(?![0-9a-f])/;

/**
 * Busca el token de invitación dentro de lo que pegó el usuario: el link
 * completo (con o sin texto alrededor, como llega por WhatsApp) o el token
 * solo. Ignora mayúsculas. Devuelve el token en minúscula, o null.
 */
export function extractInvitationToken(value: string): string | null {
  const match = value.toLowerCase().match(TOKEN_IN_TEXT);
  if (!match) return null;
  return TOKEN_PATTERN.test(match[0]) ? match[0] : null;
}
