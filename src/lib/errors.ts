/**
 * Traducción de errores de Postgres/Supabase a mensajes para el usuario.
 * Las funciones SQL lanzan claves estables (D-012); acá viven los textos.
 */

const BUSINESS_ERRORS: Record<string, string> = {
  not_authenticated: "Tu sesión expiró. Volvé a ingresar.",
  forbidden: "No tenés permisos para hacer esto.",
  admin_reserved: "Solo el administrador de FulBot puede tener ese rol.",
  attendance_closed: "Este partido ya no acepta confirmaciones.",
  player_not_linked: "Primero vinculá tu ficha del plantel.",
  invalid_attendance: "Datos inválidos.",
  rate_limited: "Hiciste demasiados intentos. Probá de nuevo más tarde.",
  group_not_found: "No encontramos ese grupo.",
  last_admin: "El grupo necesita al menos un administrador. Designá a otra persona antes.",
  invalid_timezone: "La zona horaria no es válida.",
  invitation_not_found: "La invitación no existe.",
  invitation_revoked: "Esta invitación fue revocada. Pedile una nueva a quien te invitó.",
  invitation_expired: "Esta invitación venció. Pedile una nueva a quien te invitó.",
  invitation_exhausted: "Esta invitación ya se usó todas las veces permitidas.",
  player_not_found: "No encontramos ese jugador.",
  player_already_claimed: "Esa ficha ya está vinculada a otra cuenta.",
  already_has_player: "Ya tenés una ficha en este grupo.",
  player_field_forbidden: "Solo un administrador puede cambiar ese dato.",
  positions_must_differ: "La posición secundaria tiene que ser distinta de la principal.",
  season_overlap: "Las fechas se superponen con otra temporada.",
  match_not_found: "No encontramos ese partido.",
  match_locked: "El partido ya no admite ese cambio.",
  use_record_result: "Para finalizar un partido cargá su resultado.",
  teams_not_set: "Primero armá los dos equipos.",
  player_in_both_teams: "Un jugador no puede estar en los dos equipos.",
  player_not_in_match: "Ese jugador no está convocado al partido.",
  duplicate_participant: "Hay jugadores repetidos en la lista.",
  too_many_participants: "La convocatoria tiene demasiados jugadores.",
  invalid_participants: "La convocatoria no es válida.",
  invalid_score: "El marcador no es válido.",
  invalid_events: "Hay goles o asistencias mal cargados.",
  goals_exceed_score: "Hay más goles asignados que los del marcador.",
  assists_exceed_goals: "Hay más asistencias que goles en un equipo.",
  event_team_mismatch: "Un gol o asistencia quedó asignado al equipo equivocado.",
  voting_not_open: "La votación de este partido todavía no está abierta.",
  voting_closed: "La votación de este partido ya cerró.",
  not_a_participant: "Solo votan quienes jugaron el partido.",
  cannot_rate_self: "No podés votarte a vos mismo.",
  rated_not_in_match: "Solo podés calificar a quienes jugaron.",
  invalid_ratings: "Las calificaciones no son válidas.",
  invalid_skill_history: "Los datos de valoración no son válidos.",
  too_many_rows: "Son demasiados datos para procesar de una vez.",
};

const CONSTRAINT_ERRORS: Record<string, string> = {
  players_group_nickname_key: "Ya hay un jugador con ese apodo en el grupo.",
  players_group_profile_key: "Esa cuenta ya tiene una ficha en el grupo.",
  players_member_fkey: "Solo se puede vincular a alguien que ya es miembro del grupo.",
  player_aliases_group_alias_key: "Ese alias ya está en uso en el grupo.",
  match_participants_player_fkey: "El jugador tiene partidos registrados: desactivalo en lugar de borrarlo.",
  invitations_player_single_use: "Una invitación para una ficha puntual se usa una sola vez.",
  seasons_dates_check: "La fecha de fin no puede ser anterior a la de inicio.",
  team_constraints_pair_key: "Ya hay una restricción para esos dos jugadores.",
  team_constraints_distinct_players: "Elegí dos jugadores distintos.",
  team_constraints_player_a_fkey: "Los jugadores tienen que ser del grupo.",
  team_constraints_player_b_fkey: "Los jugadores tienen que ser del grupo.",
};

export interface DbErrorLike {
  message?: string;
  code?: string;
  details?: string | null;
  hint?: string | null;
}

export const GENERIC_ERROR = "Algo salió mal. Probá de nuevo en unos segundos.";

export function toUserMessage(error: DbErrorLike | null | undefined, fallback = GENERIC_ERROR): string {
  if (!error) return fallback;
  const message = error.message ?? "";

  const businessKey = message.trim();
  if (businessKey in BUSINESS_ERRORS) return BUSINESS_ERRORS[businessKey];

  const constraint = /constraint "([^"]+)"/.exec(message)?.[1] ?? /constraint "([^"]+)"/.exec(error.details ?? "")?.[1];
  if (constraint && constraint in CONSTRAINT_ERRORS) return CONSTRAINT_ERRORS[constraint];

  if (error.code === "42501" || message.includes("row-level security") || message.includes("permission denied")) {
    return BUSINESS_ERRORS.forbidden;
  }
  if (error.code === "23514") return "Algún dato no cumple las reglas permitidas.";
  if (error.code === "22P02") return "Algún dato tiene un formato inválido.";
  if (error.code === "PGRST116") return "No encontramos lo que buscabas.";

  return fallback;
}

/** Clave de negocio (si la hay) para lógica condicional en la UI. */
export function businessErrorKey(error: DbErrorLike | null | undefined): string | null {
  const key = error?.message?.trim();
  return key && key in BUSINESS_ERRORS ? key : null;
}

const AUTH_ERRORS: Record<string, string> = {
  invalid_credentials: "Email o contraseña incorrectos.",
  email_not_confirmed: "Todavía no confirmaste tu email. Revisá tu casilla (y el spam).",
  user_already_exists: "Ya existe una cuenta con ese email. Probá ingresar.",
  email_exists: "Ya existe una cuenta con ese email. Probá ingresar.",
  weak_password: "La contraseña es débil: usá al menos 8 caracteres con letras y números.",
  same_password: "La nueva contraseña tiene que ser distinta de la anterior.",
  over_email_send_rate_limit: "Enviamos demasiados emails. Esperá unos minutos y probá de nuevo.",
  over_request_rate_limit: "Demasiados intentos. Esperá unos minutos.",
  signup_disabled: "El registro está deshabilitado por ahora.",
  session_not_found: "Tu sesión expiró. Volvé a ingresar.",
  otp_expired: "El link venció. Pedí uno nuevo.",
};

export function toAuthMessage(error: { code?: string; message?: string } | null | undefined): string {
  if (!error) return GENERIC_ERROR;
  if (error.code && error.code in AUTH_ERRORS) return AUTH_ERRORS[error.code];
  return GENERIC_ERROR;
}
