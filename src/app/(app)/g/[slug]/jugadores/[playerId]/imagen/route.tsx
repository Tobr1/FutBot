import { ImageResponse } from "next/og";
import { connection, type NextRequest } from "next/server";
import { findGroupContext } from "@/features/groups/queries";
import { PlayerShareImage, SHARE_SIZE } from "@/features/share/share-art";
import { getPlayerShareArt } from "@/features/share/queries";
import { todayIso } from "@/lib/format";

/**
 * Imagen para compartir la ficha de un jugador (1080×1350). Lee la sesión
 * (cookies): siempre dinámica. Sin sesión o sin membresía responde 404.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/g/[slug]/jugadores/[playerId]/imagen">) {
  const { slug, playerId } = await ctx.params;
  const group = await findGroupContext(slug);
  await connection();
  const share = group ? await getPlayerShareArt(group, playerId, todayIso(group.group.timezone, new Date())) : null;
  if (!share) return new Response("No encontrado", { status: 404, headers: { "Cache-Control": "private, no-store" } });

  return new ImageResponse(<PlayerShareImage data={share.art} />, {
    ...SHARE_SIZE,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Disposition": `inline; filename="${share.fileName}"`,
    },
  });
}
