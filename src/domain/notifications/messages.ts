/**
 * Textos de los avisos al celular. Puro: recibe los datos ya leídos y arma
 * título, cuerpo y a dónde lleva tocar el aviso.
 */

import { formatMatchDay } from "@/domain/matches/datetime";

export type PushEvent = "match_created" | "voting_open" | "validation_request";

export const PUSH_EVENTS: readonly PushEvent[] = ["match_created", "voting_open", "validation_request"];

/** Nombre y explicación de cada aviso para la pantalla de ajustes. */
export const PUSH_EVENT_LABELS: Record<PushEvent, { title: string; description: string }> = {
  match_created: { title: "Partido nuevo", description: "Cuando se arma un partido, para que confirmes si vas." },
  voting_open: { title: "Votación abierta", description: "Cuando se carga el resultado de un partido que jugaste." },
  validation_request: { title: "Validar compañeros", description: "Cuando un compañero carga su autoevaluación." },
};

export interface PushMessage {
  title: string;
  body: string;
  /** Ruta de la app que abre el aviso. */
  url: string;
  /** Agrupa avisos: uno nuevo con el mismo tag reemplaza al anterior. */
  tag: string;
}

export function matchCreatedMessage(input: {
  groupName: string;
  scheduledAt: string;
  timeZone: string;
  venue: string | null;
  url: string;
  matchId: string;
}): PushMessage {
  const when = formatMatchDay(input.scheduledAt, input.timeZone);
  return {
    title: `Partido nuevo en ${input.groupName}`,
    body: `${when}${input.venue ? ` · ${input.venue}` : ""}. ¿Vas? Confirmalo en FulBot.`,
    url: input.url,
    tag: `match-${input.matchId}`,
  };
}

export function votingOpenMessage(input: {
  groupName: string;
  scheduledAt: string;
  timeZone: string;
  scoreA: number | null;
  scoreB: number | null;
  url: string;
  matchId: string;
}): PushMessage {
  const score = input.scoreA !== null && input.scoreB !== null ? ` (${input.scoreA}–${input.scoreB})` : "";
  return {
    title: "¡A votar!",
    body: `Ya está el resultado del partido del ${formatMatchDay(input.scheduledAt, input.timeZone)}${score}. Puntuá a tus compañeros y elegí al MVP.`,
    url: input.url,
    tag: `vote-${input.matchId}`,
  };
}

export function validationRequestMessage(input: { groupName: string; nickname: string; url: string; playerId: string }): PushMessage {
  return {
    title: `${input.nickname} quiere que lo valides`,
    body: `Cargó su autoevaluación en ${input.groupName}. Validá sus atributos: tu opinión es privada.`,
    url: input.url,
    tag: `validate-${input.playerId}`,
  };
}

export function testMessage(url: string): PushMessage {
  return {
    title: "¡Avisos activados!",
    body: "Así te va a llegar cada aviso de FulBot.",
    url,
    tag: "test",
  };
}
