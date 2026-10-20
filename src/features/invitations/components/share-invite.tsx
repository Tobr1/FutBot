"use client";

import { Check, Copy, MessageCircle, Share2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";

const noopSubscribe = () => () => {};

/**
 * Link de invitación listo para mandar. En el teléfono (puntero grueso) con
 * share nativo, "Compartir" es la acción principal; si no, WhatsApp. El link
 * se copia tocando el chip.
 */
export function ShareInvite({ url, message }: { url: string; message: string }) {
  const [copied, setCopied] = useState(false);
  const text = `${message}\n${url}`;
  const canShare = useSyncExternalStore(noopSubscribe, () => typeof navigator.share === "function", () => false);
  const coarse = useMediaQuery("(pointer: coarse)");
  const shareFirst = canShare && coarse;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      navigator.vibrate?.(10);
      setCopied(true);
      toast.success("Link copiado.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar. Mantené apretado el link y copialo a mano.");
    }
  }

  async function share() {
    try {
      await navigator.share({ text });
    } catch (error) {
      // Cancelar la hoja de compartir no es un error; cualquier otra falla, copiamos.
      if (error instanceof Error && error.name === "AbortError") return;
      await copy();
    }
  }

  const whatsapp = (size: "lg" | "default") => (
    <Button asChild variant="whatsapp" size={size} className="w-full">
      <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
        <MessageCircle aria-hidden="true" />
        WhatsApp
      </a>
    </Button>
  );

  return (
    // grid-cols-1 = minmax(0, 1fr): el link largo se recorta en vez de ensanchar la pantalla.
    <div className="grid grid-cols-1 gap-3">
      <button
        type="button"
        onClick={copy}
        aria-label="Copiar link de invitación"
        className="pressable flex min-h-11 w-full min-w-0 items-center gap-2 rounded-lg bg-secondary/60 px-3 font-mono text-xs text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
      >
        <span className="min-w-0 flex-1 truncate text-left">{url}</span>
        {copied ? (
          <Check className="size-4 shrink-0 text-success" aria-hidden="true" />
        ) : (
          <Copy className="size-4 shrink-0" aria-hidden="true" />
        )}
      </button>

      <div className="grid grid-cols-1 gap-2">
        {shareFirst ? (
          <>
            <Button type="button" size="lg" onClick={share} className="w-full">
              <Share2 aria-hidden="true" />
              Compartir
            </Button>
            {whatsapp("default")}
          </>
        ) : (
          <>
            {whatsapp("lg")}
            {canShare && (
              <Button type="button" variant="secondary" onClick={share} className="w-full">
                <Share2 aria-hidden="true" />
                Compartir
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
