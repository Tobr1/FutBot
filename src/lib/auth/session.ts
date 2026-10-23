import "server-only";
import { io } from "next/cache";
import { redirect } from "next/navigation";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { routes } from "@/lib/routes";
import { createClient } from "@/lib/supabase/server";

export interface SessionUser {
  id: string;
  email: string | null;
}

export interface CurrentProfile {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * Usuario de la sesión verificado (getClaims valida el JWT). Deduplicado por
 * request. Lee cookies: llamarlo siempre dentro de un <Suspense>.
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  // Sin Supabase configurado no hay sesión posible: el login muestra cómo configurarlo.
  if (!isSupabaseConfigured) return null;
  const supabase = await createClient();
  // getClaims compara el vencimiento del token con la hora actual (Date.now()).
  // Con partialPrefetching el shell se arma con las cookies disponibles, así que
  // io() avisa que lo que sigue es por request: en el prerender suspende (queda
  // el fallback del <Suspense>) y en un request real resuelve al instante.
  await io();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { id: data.claims.sub, email: (data.claims.email as string | undefined) ?? null };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(routes.login);
  return user;
}

export const getCurrentProfile = cache(async (): Promise<CurrentProfile> => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email,
    displayName: data?.display_name ?? user.email?.split("@")[0] ?? "Jugador",
    avatarUrl: data?.avatar_url ?? null,
  };
});
