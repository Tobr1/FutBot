import { z } from "zod";
import { ATTRIBUTE_MAX, ATTRIBUTE_MIN } from "@/domain/cards/cards";

const values = z
  .array(z.number().int().min(ATTRIBUTE_MIN).max(ATTRIBUTE_MAX), { error: "Valores inválidos." })
  .length(6, "Faltan atributos.");

export const selfAssessmentSchema = z.object({ groupId: z.uuid(), values });
export const validationSchema = z.object({ playerId: z.uuid(), values });
