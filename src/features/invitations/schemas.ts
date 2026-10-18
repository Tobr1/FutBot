import { z } from "zod";

const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" || value === null ? undefined : value), schema.optional());

export const EXPIRY_OPTIONS = [
  { value: "1", label: "1 día" },
  { value: "7", label: "7 días" },
  { value: "30", label: "30 días" },
  { value: "never", label: "Sin vencimiento" },
] as const;

export const createInvitationSchema = z
  .object({
    groupId: z.uuid(),
    role: z.enum(["admin", "player"]).default("player"),
    expiresIn: z.enum(["1", "7", "30", "never"]).default("7"),
    maxUses: optional(z.coerce.number().int().min(1, "Mínimo 1.").max(500, "Máximo 500.")),
    playerId: optional(z.uuid()),
  })
  .transform((v) => ({
    ...v,
    // Una invitación para una ficha puntual se usa una sola vez (regla de la base).
    maxUses: v.playerId ? 1 : v.maxUses,
  }));

export type CreateInvitationInput = z.input<typeof createInvitationSchema>;

export { TOKEN_PATTERN } from "@/domain/invitations/extract-token";
