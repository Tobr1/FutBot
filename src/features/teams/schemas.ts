import { z } from "zod";
import { TEAM_RULE_NOTE_MAX } from "@/domain/matches/team-generator";

export const teamRuleSchema = z
  .object({
    groupId: z.uuid(),
    playerA: z.uuid({ error: "Elegí el primer jugador." }),
    playerB: z.uuid({ error: "Elegí el segundo jugador." }),
    kind: z.enum(["together", "apart"], { error: "Elegí si juegan juntos o separados." }),
    note: z
      .string()
      .trim()
      .max(TEAM_RULE_NOTE_MAX, `Usá como máximo ${TEAM_RULE_NOTE_MAX} caracteres.`)
      .optional()
      .transform((v) => (v ? v : null)),
  })
  .refine((v) => v.playerA !== v.playerB, { message: "Elegí dos jugadores distintos.", path: ["playerB"] });

export const deleteTeamRuleSchema = z.object({ groupId: z.uuid(), ruleId: z.uuid() });
