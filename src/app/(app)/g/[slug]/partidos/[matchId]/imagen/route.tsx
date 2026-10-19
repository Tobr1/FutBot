import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { findGroupContext } from "@/features/groups/queries";
import { MatchShareImage, SHARE_SIZE } from "@/features/share/share-art";
import { getMatchShareArt } from "@/features/share/queries";

/**
 * Imagen para compartir el resultado de un partido jugado (1080×1350).
 * Lee la sesión (cookies): siempre dinámica. Sin sesión, sin membresía o sin
 * resultado responde 404, así no se revela si el grupo o el partido existen.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/g/[slug]/partidos/[matchId]/imagen">) {
  const { slug, matchId } = await ctx.params;
  const group = await findGroupContext(slug);
  const share = group ? await getMatchShareArt(group, matchId) : null;
  if (!share) return new Response("No encontrado", { status: 404, headers: { "Cache-Control": "private, no-store" } });

  return new ImageResponse(<MatchShareImage data={share.art} />, {
    ...SHARE_SIZE,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${share.fileName}"`,
    },
  });
}
