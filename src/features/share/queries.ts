import "server-only";
import { isoToZoned, WEEKDAYS_LONG } from "@/domain/matches/datetime";
import { summarizeEvents } from "@/domain/matches/result";
import { POSITION_LABELS } from "@/domain/players/positions";
import { overall, ratingTier, TIER_LABELS } from "@/domain/players/rating";
import { effectiveness } from "@/domain/players/stats";
import { scorerLabel, shareFileName } from "@/domain/share/text";
import { getPlayerAwards } from "@/features/awards/queries";
import type { GroupContext } from "@/features/groups/queries";
import { getMatch } from "@/features/matches/queries";
import { getPlayer } from "@/features/players/queries";
import type { MatchShareArt, PlayerShareArt } from "./share-art";

/*
 * Datos de las imágenes para compartir. Reciben un GroupContext ya
 * verificado (sesión + membresía) y leen con el token del usuario: RLS
 * sigue siendo la última barrera.
 */

/** "Sábado 25/10". */
export function longDayLabel(iso: string, timeZone: string): string {
  const local = isoToZoned(iso, timeZone);
  const [, month, day] = local.date.split("-");
  const weekday = WEEKDAYS_LONG[local.weekday];
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${day}/${month}`;
}

export async function getMatchShareArt(ctx: GroupContext, matchId: string): Promise<{ art: MatchShareArt; fileName: string } | null> {
  const match = await getMatch(ctx.group.id, matchId);
  if (!match || match.status !== "finished") return null;

  const names = new Map(match.participants.map((p) => [p.id, p.nickname]));
  const nameOf = (id: string | null) => (id ? (names.get(id) ?? "—") : "sin autor");
  const scoreA = match.teams.a.score ?? 0;
  const scoreB = match.teams.b.score ?? 0;
  const summary = summarizeEvents(scoreA, scoreB, match.events, (id) => names.get(id) ?? id);
  const scorers = (side: "a" | "b") => [
    ...summary[side].scorers.map((t) => scorerLabel(nameOf(t.playerId), t.count)),
    ...summary[side].ownGoals.map((og) => `En contra (${nameOf(og.playerId)})`),
  ];
  const day = longDayLabel(match.scheduledAt, ctx.group.timezone);

  return {
    art: {
      groupName: ctx.group.name,
      subtitle: match.venue ? `${day} · ${match.venue}` : day,
      teams: {
        a: { name: match.teams.a.name, score: scoreA, scorers: scorers("a") },
        b: { name: match.teams.b.name, score: scoreB, scorers: scorers("b") },
      },
      mvp: match.mvp ? (names.get(match.mvp.playerId) ?? null) : null,
    },
    fileName: shareFileName("partido", isoToZoned(match.scheduledAt, ctx.group.timezone).date),
  };
}

export async function getPlayerShareArt(
  ctx: GroupContext,
  playerId: string,
  today: string,
): Promise<{ art: PlayerShareArt; fileName: string } | null> {
  const player = await getPlayer(ctx.group.id, playerId);
  if (!player) return null;
  const awards = await getPlayerAwards(ctx.group.id, player.id, { today, minMatches: ctx.group.ranking_min_matches });
  const { stats } = player;
  const winRate = effectiveness(stats);
  const tier = ratingTier(player.rating);

  return {
    art: {
      groupName: ctx.group.name,
      nickname: player.nickname,
      overall: overall(player.rating),
      tier,
      tierLabel: TIER_LABELS[tier],
      position: player.positions.primary ? POSITION_LABELS[player.positions.primary].long : null,
      isProvisional: player.isProvisional,
      stats: [
        { label: "PJ", value: String(stats.matches) },
        { label: "GOLES", value: String(stats.goals) },
        { label: "ASIST.", value: String(stats.assists) },
        { label: "MVP", value: String(stats.mvps) },
        { label: "%VIC", value: winRate === null ? "—" : `${winRate}%` },
      ],
      record: { wins: stats.wins, draws: stats.draws, losses: stats.losses },
      awards: { total: awards.total, titles: awards.earned.slice(0, 3).map((g) => g.award.title) },
    },
    fileName: shareFileName(player.nickname),
  };
}
