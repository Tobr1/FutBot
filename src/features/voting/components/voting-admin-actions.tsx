"use client";

import { Lock, MessageCircle } from "lucide-react";
import { useState } from "react";
import { whatsappShareUrl } from "@/domain/matches/attendance";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { type VotingShareInput, votingShareMessage } from "@/domain/voting/share";
import { closeVotingAction } from "../actions";

/**
 * Acciones del admin sobre una votación abierta: avisar por WhatsApp (con el
 * link a votar, armado con el origen actual) y cerrarla antes de tiempo.
 */
export function VotingAdminActions({
  matchId,
  votePath,
  message,
}: {
  matchId: string;
  /** Ruta de la pantalla de votar (relativa). */
  votePath: string;
  message: Omit<VotingShareInput, "url">;
}) {
  const [confirmClose, setConfirmClose] = useState(false);

  function share() {
    const url = new URL(votePath, window.location.origin).toString();
    window.open(whatsappShareUrl(votingShareMessage({ ...message, url })), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="grid gap-2 sm:flex sm:flex-wrap">
      <Button type="button" variant="whatsapp" size="lg" onClick={share} className="w-full sm:w-auto">
        <MessageCircle aria-hidden="true" />
        Avisar por WhatsApp
      </Button>
      <Button type="button" variant="secondary" size="lg" onClick={() => setConfirmClose(true)} className="w-full sm:w-auto">
        <Lock aria-hidden="true" />
        Cerrar votación
      </Button>
      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="¿Cerrar la votación ahora?"
        description="Ya no se va a poder votar. Se publican las calificaciones y se elige el jugador del partido con los votos que hay."
        confirmLabel="Cerrar votación"
        destructive={false}
        onConfirm={() => closeVotingAction({ matchId })}
      />
    </div>
  );
}
