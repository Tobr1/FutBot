import { z } from "zod";

const goals = z.number().int().min(0, "Mínimo 0.").max(30, "Máximo 30.");

export const predictionSchema = z.object({ matchId: z.uuid(), scoreA: goals, scoreB: goals });
