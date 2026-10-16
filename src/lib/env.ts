/**
 * Variables públicas de entorno. Next.js reemplaza `process.env.NEXT_PUBLIC_*`
 * en tiempo de build solo si se referencian literalmente, por eso no se
 * accede de forma dinámica.
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export function getSupabaseEnv(): { url: string; key: string } {
  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copiá .env.example a .env.local y completalos.",
    );
  }
  return { url: supabaseUrl, key: supabaseKey };
}

/** URL pública del sitio (links de invitación y redirecciones de email). */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL ?? process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
