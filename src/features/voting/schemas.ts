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
    .min(1, "Calificá al menos a un jugador.")
    .max(40, "Demasiadas calificaciones.")
    .refine((list) => new Set(list.map((r) => r.playerId)).size === list.length, "Hay jugadores repetidos."),
});

export type SubmitRatingsInput = z.infer<typeof submitRatingsSchema>;
