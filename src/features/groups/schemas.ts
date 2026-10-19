import { z } from "zod";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, message)
    .optional()
    .transform((v) => (v ? v : undefined));

export const groupNameSchema = z
  .string({ error: "Ingresá un nombre." })
  .trim()
  .min(2, "Usá al menos 2 caracteres.")
  .max(60, "Usá como máximo 60 caracteres.");

export const playersPerTeamSchema = z.coerce
  .number({ error: "Elegí el formato." })
  .int()
  .min(3, "Mínimo 3 por equipo.")
  .max(11, "Máximo 11 por equipo.");

export const createGroupSchema = z.object({
  name: groupNameSchema,
  description: optionalText(280, "Usá como máximo 280 caracteres."),
  playersPerTeam: playersPerTeamSchema,
  nickname: optionalText(30, "Usá como máximo 30 caracteres."),
});

export const groupSettingsSchema = z.object({
  groupId: z.uuid(),
  name: groupNameSchema,
  description: optionalText(280, "Usá como máximo 280 caracteres."),
  defaultPlayersPerTeam: playersPerTeamSchema,
  votingWindowHours: z.coerce.number().int().min(1, "Mínimo 1 hora.").max(336, "Máximo 14 días (336 h)."),
  rankingMinMatches: z.coerce.number().int().min(1, "Mínimo 1 partido.").max(50, "Máximo 50 partidos."),
});

export const memberRoleSchema = z.object({
  groupId: z.uuid(),
  profileId: z.uuid(),
  // El rol admin está reservado al administrador de la app (ver app_admins).
  role: z.literal("player"),
});

export const removeMemberSchema = z.object({
  groupId: z.uuid(),
  profileId: z.uuid(),
});

export const newSeasonSchema = z.object({
  groupId: z.uuid(),
  name: z.string().trim().min(1, "Ingresá un nombre.").max(40, "Usá como máximo 40 caracteres."),
  startsOn: z.iso.date("Elegí una fecha válida."),
});

/** Formato de slug generado por create_group. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
