import { z } from "zod";
import { isValidDateIso, isValidTime } from "@/domain/matches/datetime";
import { MAX_SCORE } from "@/domain/matches/result";
import { TEAM_NAME_MAX } from "@/domain/matches/teams";
import { normalizeName } from "@/domain/names/normalize";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((v) => (v ? v : undefined));

const dateSchema = z
  .string({ error: "Elegí la fecha." })
  .trim()
  .min(1, "Elegí la fecha.")
  .refine(isValidDateIso, "La fecha no es válida.");

const timeSchema = z
  .string({ error: "Elegí la hora." })
  .trim()
  .min(1, "Elegí la hora.")
  .refine(isValidTime, "La hora no es válida.");

const playersPerTeamSchema = z.coerce
  .number({ error: "Elegí el formato." })
  .int()
  .min(3, "Mínimo 3 por equipo.")
  .max(11, "Máximo 11 por equipo.");

export const participantSchema = z.object({
  playerId: z.uuid(),
  status: z.enum(["confirmed", "reserve"]),
});

export const participantsSchema = z
  .array(participantSchema)
  .max(60, "La convocatoria tiene demasiados jugadores.")
  .refine((list) => new Set(list.map((p) => p.playerId)).size === list.length, "Hay jugadores repetidos en la lista.");

/** La convocatoria viaja como JSON en un input oculto del formulario. */
const participantsJson = z
  .string()
  .optional()
  .transform((value, ctx) => {
    if (!value) return [];
    try {
      return JSON.parse(value) as unknown;
    } catch {
      ctx.addIssue({ code: "custom", message: "La convocatoria no es válida." });
      return z.NEVER;
    }
  })
  .pipe(participantsSchema);

const matchFields = {
  groupId: z.uuid(),
  date: dateSchema,
  time: timeSchema,
  venue: optionalText(80, "Usá como máximo 80 caracteres."),
  playersPerTeam: playersPerTeamSchema,
  notes: optionalText(500, "Usá como máximo 500 caracteres."),
};

export const createMatchSchema = z.object({ ...matchFields, participants: participantsJson });

export const updateMatchSchema = z.object({ ...matchFields, matchId: z.uuid() });

export const matchRefSchema = z.object({ groupId: z.uuid(), matchId: z.uuid() });

export const matchStatusSchema = matchRefSchema.extend({
  status: z.enum(["scheduled", "in_progress", "cancelled"]),
});

export const setParticipantsSchema = matchRefSchema.extend({ participants: participantsSchema });

const teamName = z.string().trim().max(TEAM_NAME_MAX, `Usá como máximo ${TEAM_NAME_MAX} caracteres.`).optional();

export const setTeamsSchema = matchRefSchema
  .extend({
    teamA: z.array(z.uuid()).min(1, "Cada equipo necesita al menos un jugador.").max(30),
    teamB: z.array(z.uuid()).min(1, "Cada equipo necesita al menos un jugador.").max(30),
    nameA: teamName,
    nameB: teamName,
  })
  .refine((v) => !v.teamA.some((id) => v.teamB.includes(id)), "Un jugador no puede estar en los dos equipos.");

const score = z.number().int().min(0, "El marcador no es válido.").max(MAX_SCORE, "El marcador no es válido.");

export const matchEventSchema = z.union([
  z.object({ event_type: z.enum(["goal", "assist", "own_goal"]), player_id: z.uuid() }),
  z.object({ event_type: z.literal("own_goal"), team_side: z.enum(["a", "b"]) }),
]);

export const recordResultSchema = matchRefSchema.extend({
  scoreA: score,
  scoreB: score,
  events: z.array(matchEventSchema).max(300, "Hay demasiados eventos."),
  mvpPlayerId: z.uuid().nullable(),
  notes: optionalText(500, "Usá como máximo 500 caracteres."),
});

const importNickname = z
  .string()
  .trim()
  .min(1)
  .max(30, "Usá como máximo 30 caracteres.")
  .refine((v) => normalizeName(v) !== null, "El apodo tiene que tener letras o números.");

export const importPlayersSchema = z.object({
  groupId: z.uuid(),
  players: z.array(z.object({ nickname: importNickname })).max(40),
  aliases: z.array(z.object({ playerId: z.uuid(), alias: z.string().trim().min(1).max(40) })).max(60),
});
