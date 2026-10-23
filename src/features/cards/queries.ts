import "server-only";
import { cache } from "react";
import type { AttributeKind, PublishedAttributes } from "@/domain/cards/cards";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Atributos publicados del grupo (agregado de autoevaluación y validaciones),
 * por ficha. Nunca trae los valores de cada validador.
 */
export const getGroupAttributes = cache(async (groupId: string): Promise<Map<string, PublishedAttributes>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_group_attributes", { p_group_id: groupId });
  if (error) throw error;
  return new Map(
    data.flatMap((r) => {
      if (!r.player_id || !r.kind) return [];
      return [[
      r.player_id,
      {
        kind: r.kind,
        values: [r.a1, r.a2, r.a3, r.a4, r.a5, r.a6].map((v) => Number(v ?? 0)),
        hasSelf: r.has_self ?? false,
        validators: r.validators ?? 0,
        updatedAt: r.updated_at,
      } satisfies PublishedAttributes,
    ] as const];
    }),
  );
});

/** Mi autoevaluación en la ficha propia (RLS: solo la mía), o null. */
export async function getMySelfAssessment(playerId: string, kind: AttributeKind): Promise<number[] | null> {
  if (!UUID.test(playerId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("player_self_assessments")
    .select("v1, v2, v3, v4, v5, v6")
    .eq("player_id", playerId)
    .eq("kind", kind)
    .maybeSingle();
  if (error) throw error;
  return data ? [data.v1, data.v2, data.v3, data.v4, data.v5, data.v6] : null;
}

export interface ValidationForm {
  kind: AttributeKind;
  /** mine: mi validación anterior · self: su autoevaluación · none: sin datos. */
  source: "mine" | "self" | "none";
  scores: number[] | null;
}

/** Valores iniciales para validar a un compañero. */
export async function getValidationForm(playerId: string): Promise<ValidationForm | null> {
  if (!UUID.test(playerId)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_attribute_validation_form", { p_player_id: playerId });
  if (error) throw error;
  const row = data[0];
  if (!row?.kind) return null;
  return { kind: row.kind, source: row.source as ValidationForm["source"], scores: row.scores };
}

/** Fichas del grupo que ya validé. */
export const getMyValidatedIds = cache(async (groupId: string): Promise<Set<string>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_my_attribute_validations", { p_group_id: groupId });
  if (error) throw error;
  return new Set(data.flatMap((r) => (r.player_id ? [r.player_id] : [])));
});
