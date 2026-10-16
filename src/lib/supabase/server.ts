import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente de Supabase para Server Components, Server Actions y Route Handlers.
 * Actúa siempre como el usuario de la sesión: RLS aplica en cada consulta.
 * Crear uno por request (no reutilizar entre requests).
 */
export async function createClient() {
  const cookieStore = await cookies();
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
