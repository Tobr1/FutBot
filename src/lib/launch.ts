import { routes } from "@/lib/routes";

/**
 * Destino de arranque de la PWA (start_url = /abrir) y de `/` con sesión:
 * el último grupo visitado, recordado en una cookie que setea el proxy.
 */

export const LAST_GROUP_COOKIE = "fb_last_group";

/** 180 días. */
export const LAST_GROUP_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax",
  maxAge: 15_552_000,
} as const;

const MAX_SLUG_LENGTH = 80;

/** Mismo formato que SLUG_PATTERN (features/groups/schemas.ts), sin depender de features. */
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const GROUP_PATH_PATTERN = /^\/g\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|$)/;

function isValidGroupSlug(value: unknown): value is string {
  return typeof value === "string" && value.length <= MAX_SLUG_LENGTH && SLUG_PATTERN.test(value);
}

/** Slug del grupo si la ruta está dentro de /g/[slug]; si no, null. */
export function extractGroupSlug(pathname: string): string | null {
  const slug = GROUP_PATH_PATTERN.exec(pathname)?.[1];
  return slug && slug.length <= MAX_SLUG_LENGTH ? slug : null;
}

/** Último grupo válido o, si no hay, Mis grupos. Nunca devuelve una URL externa. */
export function resolveLaunchTarget(slug?: string | null): string {
  return isValidGroupSlug(slug) ? routes.group(slug) : routes.dashboard;
}

type HeaderReader = { get(name: string): string | null };

/** Prefetches del router de Next o del navegador (Speculation Rules, link prefetch). */
export function isPrefetchRequest(headers: HeaderReader): boolean {
  if (headers.get("next-router-prefetch") !== null || headers.get("next-router-segment-prefetch") !== null) {
    return true;
  }
  const purpose = `${headers.get("purpose") ?? ""} ${headers.get("sec-purpose") ?? ""}`.toLowerCase();
  return purpose.includes("prefetch");
}

/**
 * Carga de documento completa (abrir la app, recargar, entrar por un link), no
 * un fetch RSC del router. Sin Sec-Fetch-Dest (navegadores viejos), se usa Accept.
 */
export function isDocumentNavigation(headers: HeaderReader): boolean {
  const destination = headers.get("sec-fetch-dest");
  if (destination !== null) return destination === "document";
  return (headers.get("accept") ?? "").includes("text/html");
}

/**
 * Slug a guardar en la cookie para esta request, o null si no hay que tocarla.
 *
 * Los prefetches nunca cuentan: las tarjetas de /inicio prefetchean todos los
 * grupos y pisarían el último visitado de verdad. Next quita los headers
 * internos del router (rsc, next-router-prefetch…) antes de llamar al proxy, así
 * que ahí un fetch RSC de navegación y uno de prefetch son indistinguibles: por
 * eso solo cuentan las cargas de documento.
 */
export function lastGroupToRemember(
  pathname: string,
  currentValue: string | null | undefined,
  headers: HeaderReader,
): string | null {
  const slug = extractGroupSlug(pathname);
  if (!slug || slug === currentValue) return null;
  if (isPrefetchRequest(headers) || !isDocumentNavigation(headers)) return null;
  return slug;
}
