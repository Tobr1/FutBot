import { Link2, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { InviteLinkInput } from "@/features/invitations/components/invite-link-input";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Todavía no estás en el grupo" };

/**
 * Destino de quien abre una pantalla de un grupo sin ser miembro (por
 * ejemplo, el link de un partido antes de aceptar la invitación). El mismo
 * mensaje sirve para un grupo que no existe: no se revela cuál es cuál.
 */
export default function GroupUnavailablePage() {
  return (
    <ScreenTransition>
      <div className="mx-auto grid max-w-md gap-4 pt-4">
        <EmptyState
          icon={Users}
          headingLevel="h1"
          title="Todavía no estás en este grupo"
          description="Para entrar necesitás tu link de invitación. Pedíselo al administrador del grupo y abrilo (o pegalo acá abajo)."
        />
        <div className="panel space-y-3 rounded-xl p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <Link2 className="size-4 text-primary" aria-hidden="true" />
            ¿Ya tenés el link?
          </p>
          <InviteLinkInput />
        </div>
        <Button asChild variant="secondary" size="lg">
          <Link href={routes.dashboard}>Ir a mis grupos</Link>
        </Button>
      </div>
    </ScreenTransition>
  );
}
