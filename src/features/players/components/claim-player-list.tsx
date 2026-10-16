"use client";

import { Hand } from "lucide-react";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { PositionBadge } from "@/components/shared/position-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import type { PlayerPositions } from "@/domain/players/positions";
import { claimPlayerAction } from "../actions";

export function ClaimPlayerList({
  groupId,
  players,
}: {
  groupId: string;
  players: Array<{ id: string; nickname: string; fullName: string | null; positions: PlayerPositions }>;
}) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card/70">
      {players.map((player) => (
        <li key={player.id} className="flex items-center gap-3 px-4 py-3">
          <UserAvatar name={player.nickname} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{player.nickname}</p>
            {player.fullName && <p className="truncate text-xs text-muted-foreground">{player.fullName}</p>}
          </div>
          {player.positions.primary && <PositionBadge position={player.positions.primary} />}
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="secondary">
                <Hand aria-hidden="true" />
                Soy yo
              </Button>
            }
            title={`¿Sos ${player.nickname}?`}
            description="La ficha y todas sus estadísticas quedan vinculadas a tu cuenta. Si te equivocás, un admin puede corregirlo."
            confirmLabel="Sí, soy yo"
            destructive={false}
            onConfirm={() => claimPlayerAction({ groupId, playerId: player.id })}
          />
        </li>
      ))}
    </ul>
  );
}
