import { Sparkles } from "lucide-react";
import { PlayerCard } from "@/components/shared/player-card";
import { CARD_STYLES } from "@/components/shared/tier-styles";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PlayerDetail } from "../queries";

/**
 * Banda superior de la ficha: carta del jugador e identidad (el único h1 de
 * la página, #page-title, que StackHeader observa para mostrar el título
 * compacto al scrollear). A todo el ancho y al ras del header en mobile.
 */
export function PlayerHero({ player, isMine }: { player: PlayerDetail; isMine: boolean }) {
  const style = CARD_STYLES[player.card.elite ? "elite" : player.card.tier];
  const isProvisional = player.card.provisional;

  return (
    <div
      data-slot="player-hero"
      className="relative isolate -mx-4 -mt-6 overflow-hidden px-4 pt-5 pb-6 lg:mx-0 lg:mt-0 lg:rounded-2xl"
    >
      <span aria-hidden="true" className={cn("absolute inset-0 -z-10 opacity-30", style.face)} />
      <span aria-hidden="true" className="pitch-lines absolute inset-0 -z-10 opacity-40" />
      <span aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-b from-transparent to-background" />

      <div className="grid grid-cols-[minmax(0,8.5rem)_1fr] items-center gap-4 md:grid-cols-[240px_1fr]">
        <PlayerCard
          priority
          headingLevel="p"
          showFullName={false}
          player={{
            nickname: player.nickname,
            avatarUrl: player.avatarUrl,
            rating: player.rating,
            primaryPosition: player.positions.primary,
            isProvisional,
            isLinked: player.isLinked,
            isActive: player.isActive,
            card: player.card,
          }}
        />

        <div className="min-w-0 space-y-2">
          <p className="text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Ficha</p>
          <div className="space-y-1">
            <h1
              id="page-title"
              className="font-display text-display-lg font-extrabold tracking-wide wrap-break-word uppercase sm:text-4xl sm:leading-[0.95]"
            >
              {player.nickname}
            </h1>
            {player.fullName && <p className="truncate text-sm text-muted-foreground">{player.fullName}</p>}
          </div>

          {(isMine || player.isGuest || !player.isActive || !player.isLinked || isProvisional) && (
            <ul className="flex flex-wrap gap-1.5 pt-1" aria-label="Estado de la ficha">
              {isMine && (
                <li>
                  <Badge tone="primary">Sos vos</Badge>
                </li>
              )}
              {player.isGuest && (
                <li>
                  <Badge tone="primary">Invitado</Badge>
                </li>
              )}
              {!player.isActive && (
                <li>
                  <Badge tone="neutral">Inactivo</Badge>
                </li>
              )}
              {!player.isLinked && (
                <li>
                  <Badge tone="neutral">Sin cuenta</Badge>
                </li>
              )}
              {isProvisional && (
                <li>
                  <Badge tone="neutral">
                    <Sparkles aria-hidden="true" />
                    Provisional
                  </Badge>
                </li>
              )}
            </ul>
          )}

        </div>
      </div>
    </div>
  );
}
