"use client";

import { Check, Copy, MessageCircle, Share2 } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const noopSubscribe = () => () => {};

/** Link de invitación con copiar, WhatsApp y compartir nativo. */
export function ShareInvite({ url, message }: { url: string; message: string }) {
  const [copied, setCopied] = useState(false);
  const text = `${message}\n${url}`;
  const canShare = useSyncExternalStore(noopSubscribe, () => typeof navigator.share === "function", () => false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copiado.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("No se pudo copiar. Seleccioná el link y copialo a mano.");
    }
  }

  async function share() {
    try {
      await navigator.share({ title: "FUTBOLEROS", text: message, url });
    } catch {
      // El usuario canceló.
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex gap-2">
        <Input value={url} readOnly aria-label="Link de invitación" onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
        <Button type="button" variant="secondary" size="icon" onClick={copy} aria-label="Copiar link">
          {copied ? <Check className="text-success" /> : <Copy />}
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button asChild className="bg-[#25D366] text-black hover:bg-[#25D366]/85">
          <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noopener noreferrer">
            <MessageCircle aria-hidden="true" />
            WhatsApp
          </a>
        </Button>
        {canShare ? (
          <Button type="button" variant="secondary" onClick={share}>
            <Share2 aria-hidden="true" />
            Compartir
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={copy}>
            <Copy aria-hidden="true" />
            Copiar
          </Button>
        )}
      </div>
    </div>
  );
}
