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
  groupHistory: (slug: string) => `/g/${slug}/historial`,
  groupRankings: (slug: string) => `/g/${slug}/rankings`,
  groupSettings: (slug: string) => `/g/${slug}/ajustes`,
  groupGeneralSettings: (slug: string) => `/g/${slug}/ajustes/general`,
  groupMembers: (slug: string) => `/g/${slug}/ajustes/miembros`,
  groupInvitations: (slug: string) => `/g/${slug}/ajustes/invitaciones`,
  groupSeasons: (slug: string) => `/g/${slug}/ajustes/temporadas`,
  groupAudit: (slug: string) => `/g/${slug}/ajustes/auditoria`,
  claimPlayer: (slug: string) => `/g/${slug}/mi-ficha`,
} as const;

/** Prefijos que requieren sesión (chequeo optimista en el proxy). */
export const PROTECTED_PREFIXES = ["/inicio", "/perfil", "/grupos", "/g/", "/nueva-clave", "/abrir"];

/** Páginas que no tienen sentido con sesión iniciada. */
export const AUTH_PAGES = ["/ingresar", "/registro", "/recuperar"];

/**
 * Sanea un destino de redirección: solo rutas internas absolutas.
 * Evita open redirects del tipo `?next=https://malicioso` o `//malicioso`.
 */
export function safeNextPath(next: string | null | undefined, fallback: string = routes.dashboard): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
