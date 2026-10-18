import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { LAST_GROUP_COOKIE, resolveLaunchTarget } from "@/lib/launch";

/**
 * start_url de la PWA: abre directo en el último grupo visitado (cookie que
 * setea el proxy) o en Mis grupos. Sin sesión, el proxy manda antes a ingresar.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const target = resolveLaunchTarget(cookieStore.get(LAST_GROUP_COOKIE)?.value);
  return NextResponse.redirect(new URL(target, request.url));
}
