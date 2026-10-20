"use client";

import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type MatchCallInput, matchCallMessage, whatsappShareUrl } from "@/domain/matches/attendance";
import { cn } from "@/lib/utils";

/**
 * Abre WhatsApp con la convocatoria lista (fecha, cancha, cupos, lista y el
 * link para confirmar) para mandarla al grupo. El link se arma con el origen
 * actual, así sirve igual en producción, previews y la red local.
 */
export function WhatsAppCallButton({
  message,
  path,
  invitePath,
  label = "Avisar por WhatsApp",
  className,
}: {
  message: Omit<MatchCallInput, "url">;
  /** Ruta del partido (relativa). */
  path: string;
  /** Ruta de la invitación del grupo (relativa), para sumar a los que faltan. */
  invitePath?: string | null;
  label?: string;
  className?: string;
}) {
  function open() {
    const absolute = (p: string) => new URL(p, window.location.origin).toString();
    const text = matchCallMessage({ ...message, url: absolute(path), inviteUrl: invitePath ? absolute(invitePath) : null });
    window.open(whatsappShareUrl(text), "_blank", "noopener,noreferrer");
  }

  return (
    <Button type="button" size="lg" variant="whatsapp" onClick={open} className={cn("w-full lg:w-auto", className)}>
      <MessageCircle aria-hidden="true" />
      {label}
    </Button>
  );
}
