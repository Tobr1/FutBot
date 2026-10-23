import { z } from "zod";
import { SCORE_MAX, SCORE_MIN } from "@/domain/voting/voting";

export const submitRatingsSchema = z.object({
  groupId: z.uuid(),
  matchId: z.uuid(),
  ratings: z
    .array(
      z.object({
        playerId: z.uuid(),
        score: z
          .number()
          .int("La calificación va de 1 a 10.")
          .min(SCORE_MIN, "La calificación va de 1 a 10.")
          .max(SCORE_MAX, "La calificación va de 1 a 10."),
      }),
    )
    .max(40, "Demasiadas calificaciones.")
    .refine((list) => new Set(list.map((r) => r.playerId)).size === list.length, "Hay jugadores repetidos."),
  /** Jugador del partido elegido (uno solo, nunca uno mismo: lo valida la RPC). */
  mvpPlayerId: z.uuid().nullable().default(null),
}).refine((v) => v.ratings.length > 0 || v.mvpPlayerId !== null, "Calificá al menos a un jugador o elegí al MVP.");

export const closeVotingSchema = z.object({ matchId: z.uuid() });

export type SubmitRatingsInput = z.infer<typeof submitRatingsSchema>;
