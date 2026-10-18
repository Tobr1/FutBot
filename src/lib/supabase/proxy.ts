import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { getSupabaseEnv, isSupabaseConfigured } from "@/lib/env";
import {
  LAST_GROUP_COOKIE,
  LAST_GROUP_COOKIE_OPTIONS,
  lastGroupToRemember,
  resolveLaunchTarget,
} from "@/lib/launch";
import { AUTH_PAGES, PROTECTED_PREFIXES, routes, safeNextPath } from "@/lib/routes";
import type { Database } from "@/types/database";

/**
 * Refresca la sesión de Supabase en cada request y hace la redirección
 * optimista de rutas privadas. La autorización real ocurre en el DAL y en RLS.
 *
 * Con sesión, además: `/` abre el último grupo visitado (o Mis grupos) y cada
 * carga de documento en /g/[slug] actualiza la cookie fb_last_group. Nunca un
 * prefetch (ver lastGroupToRemember en lib/launch.ts).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured) {
    return response;
  }

  const { url, key } = getSupabaseEnv();
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
        for (const [header, value] of Object.entries(headers)) {
          response.headers.set(header, value);
        }
      },
    },
  });

  // No agregar lógica entre la creación del cliente y getClaims(): el refresco
  // del token debe completarse antes de generar la respuesta.
  const { data } = await supabase.auth.getClaims();
  const isAuthenticated = Boolean(data?.claims?.sub);

  const { pathname, search } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
  const isAuthPage = AUTH_PAGES.includes(pathname);

  if (!isAuthenticated && isProtected) {
    const target = request.nextUrl.clone();
    target.pathname = routes.login;
    target.search = `?next=${encodeURIComponent(pathname + search)}`;
    return redirectPreservingCookies(target, response);
  }

  if (isAuthenticated && isAuthPage) {
    const target = new URL(safeNextPath(request.nextUrl.searchParams.get("next")), request.url);
    return redirectPreservingCookies(target, response);
  }

  if (isAuthenticated && pathname === routes.home) {
    const target = new URL(resolveLaunchTarget(request.cookies.get(LAST_GROUP_COOKIE)?.value), request.url);
    return redirectPreservingCookies(target, response);
  }

  if (isAuthenticated) {
    const lastGroup = lastGroupToRemember(pathname, request.cookies.get(LAST_GROUP_COOKIE)?.value, request.headers);
    if (lastGroup) {
      // `response` ya es la respuesta final (setAll pudo reemplazarla durante getClaims).
      response.cookies.set(LAST_GROUP_COOKIE, lastGroup, LAST_GROUP_COOKIE_OPTIONS);
    }
  }

  return response;
}

function redirectPreservingCookies(target: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(target);
  for (const cookie of from.cookies.getAll()) {
    redirect.cookies.set(cookie);
  }
  return redirect;
}
