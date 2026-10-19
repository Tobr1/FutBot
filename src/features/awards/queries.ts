import "server-only";
import { cache } from "react";
import {
  type Award,
  type AwardGroup,
  type AwardProgress,
  awardProgress,
  awardsForPlayer,
  computeAwards,
  computeRecords,
  type GroupRecords,
  groupAwards,
  type MonthAwards,
  monthlyAwards,
  pickSeasonChampion,
  type SeasonChampion,
} from "@/domain/awards";
import type { RatingPosition } from "@/domain/rating";
import { seasonRange } from "@/domain/stats/seasons";
import { getGroupRatings, listSeasonsForStats, loadGroupHistory } from "@/features/stats/queries";

/*
 * DAL de premios y logros (D-035, D-036). Se calculan al leer desde los mismos hechos
 * que el motor (loadGroupHistory, memoizado por request): no hay tablas nuevas.
 */

export interface GroupAwardsData {
  awards: Award[];
  months: MonthAwards[];
  records: GroupRecords;
  /** Nombre y avatar por jugador para las listas. */
  players: Record<string, { nickname: string; avatarUrl: string | null }>;
}

const awardsFor = cache(async (groupId: string, today: string | null, minMatches: number): Promise<GroupAwardsData> => {
  const [history, result, seasons] = await Promise.all([
    loadGroupHistory(groupId),
    getGroupRatings(groupId),
    listSeasonsForStats(groupId),
  ]);

  // Mejor promedio de cada temporada ya terminada (cada una corre el motor en su rango, memoizado).
  const closed = today ? seasons.filter((s) => s.ends_on !== null && s.ends_on < today) : [];
  const seasonChampions: SeasonChampion[] = (
    await Promise.all(
      closed.map(async (season) => {
        const range = seasonRange(season);
        const champion = pickSeasonChampion(await getGroupRatings(groupId, range), minMatches);
        return champion
          ? { seasonId: season.id, seasonName: season.name, range, playerId: champion.playerId, display: champion.display }
          : null;
      }),
    )
  ).filter((c): c is SeasonChampion => c !== null);

  const positions: Record<string, RatingPosition | null> = {};
  const players: GroupAwardsData["players"] = {};
  for (const p of history.roster) {
    positions[p.id] = p.primaryPosition;
    players[p.id] = { nickname: p.nickname, avatarUrl: p.avatarUrl };
  }

  const input = { lines: history.lines, timeZone: history.timeZone, positions, today, performances: result.byMatch, seasonChampions };
  return {
    awards: computeAwards(input),
    months: monthlyAwards(input),
    records: computeRecords(history.lines),
    players,
  };
});

/**
 * Logros del grupo. `today` (fecha local, leída después de connection()) cierra
 * los meses y temporadas terminados; `minMatches` es el mínimo de partidos con
 * votos para el mejor promedio de la temporada.
 */
export function getGroupAwards(groupId: string, options: { today: string | null; minMatches: number }): Promise<GroupAwardsData> {
  return awardsFor(groupId, options.today, Math.max(1, options.minMatches));
}

export interface PlayerAwardsData {
  earned: AwardGroup[];
  total: number;
  progress: AwardProgress[];
}

/** Logros de un jugador (agrupados) y su progreso hacia los próximos escalones. */
export async function getPlayerAwards(
  groupId: string,
  playerId: string,
  options: { today: string | null; minMatches: number },
): Promise<PlayerAwardsData> {
  const [data, history] = await Promise.all([getGroupAwards(groupId, options), loadGroupHistory(groupId)]);
  const mine = awardsForPlayer(data.awards, playerId);
  return { earned: groupAwards(mine), total: mine.length, progress: awardProgress(history.lines, playerId) };
}
