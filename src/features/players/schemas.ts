import { z } from "zod";
import { normalizeName } from "@/domain/names/normalize";
import { DOMINANT_FEET, POSITIONS } from "@/domain/players/positions";

/** Los <select> vacíos llegan como "": tratarlos como ausentes. */
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" || value === null ? undefined : value), schema.optional());

export const nicknameSchema = z
  .string({ error: "Ingresá un apodo." })
  .trim()
  .min(1, "Ingresá un apodo.")
  .max(30, "Usá como máximo 30 caracteres.")
  .refine((v) => normalizeName(v) !== null, "El apodo tiene que tener letras o números.");

const positionsShape = {
  primaryPosition: optional(z.enum(POSITIONS, { error: "Posición inválida." })),
  secondaryPosition: optional(z.enum(POSITIONS, { error: "Posición inválida." })),
};

const differentPositions = <T extends { primaryPosition?: string; secondaryPosition?: string }>(v: T) =>
  !v.secondaryPosition || v.secondaryPosition !== v.primaryPosition;

const differentPositionsIssue = {
  path: ["secondaryPosition"],
  message: "Tiene que ser distinta de la principal.",
};

export const playerFormSchema = z
  .object({
    groupId: z.uuid(),
    playerId: optional(z.uuid()),
    nickname: nicknameSchema,
    fullName: optional(z.string().trim().max(80, "Usá como máximo 80 caracteres.")),
    dominantFoot: optional(z.enum(DOMINANT_FEET)),
    baseRating: z.coerce
      .number({ error: "Elegí un nivel." })
      .min(1, "El mínimo es 1.")
      .max(10, "El máximo es 10.")
      .transform((v) => Math.round(v * 10) / 10),
    ...positionsShape,
  })
  .refine(differentPositions, differentPositionsIssue);

/** Lo que un jugador puede editar de su propia ficha. */
export const ownPlayerFormSchema = z
  .object({
    groupId: z.uuid(),
    playerId: z.uuid(),
    fullName: optional(z.string().trim().max(80, "Usá como máximo 80 caracteres.")),
    dominantFoot: optional(z.enum(DOMINANT_FEET)),
    ...positionsShape,
  })
  .refine(differentPositions, differentPositionsIssue);

export const createOwnPlayerSchema = z
  .object({
    groupId: z.uuid(),
    nickname: nicknameSchema,
    dominantFoot: optional(z.enum(DOMINANT_FEET)),
    ...positionsShape,
  })
  .refine(differentPositions, differentPositionsIssue);

export const playerRefSchema = z.object({
  groupId: z.uuid(),
  playerId: z.uuid(),
});
