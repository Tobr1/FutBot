"use client";

import { Link2, Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createInvitationAction } from "@/features/invitations/actions";
import { ShareInvite } from "@/features/invitations/components/share-invite";
import { cn } from "@/lib/utils";

/**
 * Ficha sin cuenta (solo admin): invitación para que esa persona la vincule.
 * Recién creada, la pregunta va destacada. El link sirve una vez, vence en
 * 30 días y al aceptarlo la cuenta queda unida a esta ficha.
 */
export function InvitePlayerCard({
  groupId,
  groupName,
  playerId,
  nickname,
  fresh = false,
  className,
}: {
  groupId: string;
  groupName: string;
  playerId: string;
  nickname: string;
  /** Recién creada: el pedido de invitar va resaltado. */
  fresh?: boolean;
  className?: string;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function create() {
    if (isPending) return;
    startTransition(async () => {
      const result = await createInvitationAction({ groupId, playerId, expiresIn: "30" });
      if (result.ok && result.data) setUrl(result.data.url);
      else if (!result.ok) toast.error(result.message);
    });
  }

  return (
    <section
      aria-labelledby="invitar-ficha"
      className={cn("panel space-y-3 rounded-xl p-4", fresh && "ring-1 ring-primary/40 ring-inset", className)}
    >
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/14 text-primary ring-1 ring-primary/25">
          <Link2 className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="invitar-ficha" className="text-[15px] font-semibold">
            {fresh ? `¿Le mandás la invitación a ${nickname}?` : `${nickname} todavía no tiene cuenta`}
          </h2>
          <p className="text-sm text-muted-foreground">
            Con su link entra al grupo y esta ficha queda vinculada a su cuenta, lista para votar.
          </p>
        </div>
      </div>
      {url ? (
        <ShareInvite url={url} message={`${nickname}, sumate a "${groupName}" en FulBot para confirmar partidos y votar:`} />
      ) : (
        <Button type="button" size="lg" className="w-full lg:w-auto" onClick={create} disabled={isPending} aria-busy={isPending || undefined}>
          {isPending ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Link2 aria-hidden="true" />}
          Generar su invitación
        </Button>
      )}
    </section>
  );
}
