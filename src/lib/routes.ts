/** Rutas centralizadas para no repetir strings por toda la app. */
export const routes = {
  home: "/",
  login: "/ingresar",
  signup: "/registro",
  forgotPassword: "/recuperar",
  resetPassword: "/nueva-clave",
  dashboard: "/inicio",
  /** Destino de arranque de la PWA: redirige al último grupo (ver lib/launch.ts). */
  launch: "/abrir",
  profile: "/perfil",
  newGroup: "/grupos/nuevo",
  invitation: (token: string) => `/invitacion/${token}`,
  group: (slug: string) => `/g/${slug}`,
  groupPlayers: (slug: string) => `/g/${slug}/jugadores`,
  newPlayer: (slug: string) => `/g/${slug}/jugadores/nuevo`,
  player: (slug: string, id: string) => `/g/${slug}/jugadores/${id}`,
  editPlayer: (slug: string, id: string) => `/g/${slug}/jugadores/${id}/editar`,
  comparePlayers: (slug: string, id: string, otherId?: string) =>
    `/g/${slug}/jugadores/${id}/comparar${otherId ? `?con=${encodeURIComponent(otherId)}` : ""}`,
  groupMatches: (slug: string) => `/g/${slug}/partidos`,
  newMatch: (slug: string) => `/g/${slug}/partidos/nuevo`,
  match: (slug: string, id: string) => `/g/${slug}/partidos/${id}`,
  editMatch: (slug: string, id: string) => `/g/${slug}/partidos/${id}/editar`,
  matchTeams: (slug: string, id: string) => `/g/${slug}/partidos/${id}/equipos`,
  matchResult: (slug: string, id: string) => `/g/${slug}/partidos/${id}/resultado`,
  matchVote: (slug: string, id: string) => `/g/${slug}/partidos/${id}/votar`,
  /** Imagen para compartir del resultado (route handler, requiere sesión y membresía). */
  matchShareImage: (slug: string, id: string) => `/g/${slug}/partidos/${id}/imagen`,
  /** Imagen para compartir de la ficha (route handler, requiere sesión y membresía). */
  playerShareImage: (slug: string, id: string) => `/g/${slug}/jugadores/${id}/imagen`,
  groupHistory: (slug: string) => `/g/${slug}/historial`,
  groupRankings: (slug: string) => `/g/${slug}/rankings`,
  groupAwards: (slug: string) => `/g/${slug}/premios`,
  groupAnalytics: (slug: string) => `/g/${slug}/analisis`,
  groupSettings: (slug: string) => `/g/${slug}/ajustes`,
  /** Panel del administrador de la app (solo admins). */
  groupAdmin: (slug: string) => `/g/${slug}/admin`,
  groupGeneralSettings: (slug: string) => `/g/${slug}/ajustes/general`,
  groupMembers: (slug: string) => `/g/${slug}/ajustes/miembros`,
  groupInvitations: (slug: string) => `/g/${slug}/ajustes/invitaciones`,
  groupSeasons: (slug: string) => `/g/${slug}/ajustes/temporadas`,
  groupAudit: (slug: string) => `/g/${slug}/ajustes/auditoria`,
  groupTeamRules: (slug: string) => `/g/${slug}/ajustes/reglas`,
  claimPlayer: (slug: string) => `/g/${slug}/mi-ficha`,
  /** Votaciones del grupo: abiertas, pendientes, votadas y cerradas. */
  groupVotings: (slug: string) => `/g/${slug}/votaciones`,
  /** Quien abre un grupo sin ser miembro (o uno que no existe). */
  groupUnavailable: "/grupo-no-disponible",
} as const;

/** Prefijos que requieren sesión (chequeo optimista en el proxy). */
export const PROTECTED_PREFIXES = ["/inicio", "/perfil", "/grupos", "/g/", "/nueva-clave", "/abrir"];

/** Páginas que no tienen sentido con sesión iniciada. */
export const AUTH_PAGES = ["/ingresar", "/registro", "/recuperar"];

/**
 * Sanea un destino de redirección: solo rutas internas absolutas.
 * Evita open redirects del tipo `?next=https://malicioso` o `//malicioso`.
 * Rechaza también barras invertidas y caracteres de control: el parser de
 * URL descarta tabs y saltos de línea, así que `/\t/malicioso` terminaría
 * siendo `//malicioso` (otro origen).
 */
export function safeNextPath(next: string | null | undefined, fallback: string = routes.dashboard): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  return next;
}
