"use client";

import { Trophy } from "lucide-react";
import { useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { FilterChips } from "@/components/shared/filter-chips";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { PositionBadge } from "@/components/shared/position-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import type { Position } from "@/domain/players/positions";
import type { RankingKind, RankingList } from "@/domain/rating";
import { emptyRankingText, excludedLabel, RANKING_TABS, rankingTabBySlug } from "@/domain/stats/rankings-view";
import { Podium } from "./podium";

export interface RankingPlayerInfo {
  nickname: string;
  avatarUrl: string | null;
  primaryPosition: Position | null;
}

/**
 * Los 8 rankings con chips de scroll horizontal. Las listas llegan
 * calculadas del servidor; acá solo se alterna y se recuerda la pestaña en
 * la URL (`?ranking=`) sin pedir la página de nuevo.
 */
export function RankingsView({
  rankings,
  players,
  initialSlug,
  minMatches,
  playerHrefBase,
}: {
  rankings: Record<RankingKind, RankingList>;
  players: Record<string, RankingPlayerInfo>;
  initialSlug?: string;
  minMatches: number;
  /** Prefijo de la ficha: `${base}/${id}`. */
  playerHrefBase: string;
}) {
  const [slug, setSlug] = useState(() => rankingTabBySlug(initialSlug).slug);
  const tab = rankingTabBySlug(slug);
  const list = rankings[tab.kind];
  const entries = list.entries.filter((e) => players[e.playerId]);
  const excluded = excludedLabel(tab.kind, list.excluded, minMatches);

  function select(next: string) {
    setSlug(next);
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("ranking", next);
      window.history.replaceState(null, "", `?${params.toString()}`);
    } catch {
      // sin historial: la pestaña queda solo en memoria
    }
  }

  const info = (id: string) => players[id];
  const href = (id: string) => `${playerHrefBase}/${id}`;

  return (
    <div className="space-y-4">
      <FilterChips
        value={slug}
        onValueChange={select}
        label="Ranking"
        options={RANKING_TABS.map((t) => ({ value: t.slug, label: t.label }))}
      />

      <div role="region" aria-label={tab.label} className="space-y-4">
        <p className="text-sm text-muted-foreground">{tab.description}</p>

        {entries.length === 0 ? (
          <EmptyState size="md" icon={Trophy} tone="gold" headingLevel="h2" title="Sin datos suficientes" description={emptyRankingText(tab.kind, minMatches)} />
        ) : (
          <>
            <Podium
              className="px-1 pt-2"
              unit={tab.unit}
              entries={entries.slice(0, 3).map((e) => ({
                playerId: e.playerId,
                nickname: info(e.playerId).nickname,
                avatarUrl: info(e.playerId).avatarUrl,
                display: e.display,
                href: href(e.playerId),
              }))}
            />
            {entries.length > 3 && (
              <ListGroup ordered label={`${tab.label}: del puesto 4 en adelante`}>
                {entries.slice(3).map((e, index) => {
                  const p = info(e.playerId);
                  return (
                    <ListRow
                      key={e.playerId}
                      href={href(e.playerId)}
                      transitionTypes={["nav-forward"]}
                      leading={
                        <>
                          <span className="w-6 text-center font-display text-lg font-bold text-muted-foreground tabular">{index + 4}</span>
                          <UserAvatar name={p.nickname} src={p.avatarUrl} size="sm" />
                        </>
                      }
                      title={p.nickname}
                      subtitle={
                        <span className="flex min-w-0 items-center gap-1.5">
                          {p.primaryPosition && <PositionBadge position={p.primaryPosition} size="sm" />}
                          <span className="tabular">
                            {e.matches} {tab.kind === "bestAverage" || tab.kind === "mostRegular" ? "con votos" : "PJ"}
                          </span>
                        </span>
                      }
                      trailing={
                        <span className="font-display text-xl leading-none font-extrabold tabular">
                          {e.display}
                          {tab.unit && <span className="sr-only"> {tab.unit}</span>}
                        </span>
                      }
                    />
                  );
                })}
              </ListGroup>
            )}
          </>
        )}

        {excluded && <p className="text-xs text-muted-foreground">{excluded}</p>}
      </div>
    </div>
  );
}
