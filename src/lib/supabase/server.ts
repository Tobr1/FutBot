import "server-only";
import { createServerClient } from "@supabase/ssr";
import { io } from "next/cache";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Actúa siempre como el usuario de la sesión: RLS aplica en cada consulta.
 * Crear uno por request (no reutilizar entre requests).
 *
 * Al crearse, el cliente de auth recupera la sesión de las cookies y compara
 * su vencimiento con Date.now(). Con partialPrefetching el shell se arma con
 * las cookies disponibles, así que io() marca que lo que sigue es por request:
 * en el prerender suspende (queda el fallback del <Suspense>) y en un request
 * real resuelve al instante.
 */
export async function createClient() {
  const cookieStore = await cookies();
  await io();
  const { url, key } = getSupabaseEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Llamado desde un Server Component: no puede escribir cookies.
          // El proxy refresca la sesión en cada request, así que es seguro ignorarlo.
        }
      },
    },
  });
}

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>;
