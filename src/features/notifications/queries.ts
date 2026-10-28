import "server-only";
import type { PushEvent } from "@/domain/notifications/messages";
import { createClient } from "@/lib/supabase/server";

/** Qué avisos quiere la cuenta (sin fila: todos). */
export async function getNotificationPreferences(): Promise<Record<PushEvent, boolean>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notification_preferences")
    .select("match_created, voting_open, validation_request")
    .maybeSingle();
  return {
    match_created: data?.match_created ?? true,
    voting_open: data?.voting_open ?? true,
    validation_request: data?.validation_request ?? true,
  };
}
