import "server-only";
import { headers } from "next/headers";
import { getSiteUrl } from "@/lib/env";

/**
 * Origen para armar links absolutos (emails, invitaciones). Si hay
 * NEXT_PUBLIC_SITE_URL se usa siempre: no confiar en el header Host en producción.
 */
export async function getRequestOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return getSiteUrl();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return getSiteUrl();
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}
