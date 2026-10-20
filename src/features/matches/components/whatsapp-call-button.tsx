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
  label = "Avisar por WhatsApp",
  className,
}: {
  message: Omit<MatchCallInput, "url">;
  /** Ruta del partido (relativa). */
  path: string;
  label?: string;
  className?: string;
}) {
  function open() {
    const text = matchCallMessage({ ...message, url: new URL(path, window.location.origin).toString() });
    window.open(whatsappShareUrl(text), "_blank", "noopener,noreferrer");
  }

  return (
    <Button type="button" size="lg" variant="whatsapp" onClick={open} className={cn("w-full lg:w-auto", className)}>
      <MessageCircle aria-hidden="true" />
      {label}
    </Button>
  );
}
