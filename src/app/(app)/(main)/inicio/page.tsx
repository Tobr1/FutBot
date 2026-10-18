import { Link2, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { InstallAppCard } from "@/components/pwa/install-app-card";
import { EmptyState } from "@/components/shared/empty-state";
import { FlashToast } from "@/components/shared/flash-toast";
import { LinkPending } from "@/components/shared/link-pending";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { GroupCard } from "@/features/groups/components/group-card";
import { getMyGroups } from "@/features/groups/queries";
import { InviteLinkInput } from "@/features/invitations/components/invite-link-input";
import { getCurrentProfile } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Mis grupos" };

const FLASH = { clave: { actualizada: "Contraseña actualizada." } };

export default async function DashboardPage() {
  const [profile, groups] = await Promise.all([getCurrentProfile(), getMyGroups()]);
  const firstName = profile.displayName.split(" ")[0];

  return (
    <ScreenTransition>
      <Suspense fallback={null}>
        <FlashToast messages={FLASH} />
      </Suspense>

      <div className="space-y-6">
        <PageHeader
          eyebrow={`Hola, ${firstName}`}
          title="Mis grupos"
          actions={
            groups.length > 0 && (
              <Button asChild className="hidden lg:inline-flex">
                <Link href={routes.newGroup} transitionTypes={["nav-forward"]}>
                  <Plus aria-hidden="true" />
                  Crear grupo
                </Link>
              </Button>
            )
          }
        />

        <InstallAppCard />

        {groups.length === 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            <EmptyState
              icon={Users}
              title="Armá tu grupo"
              description="Creá el grupo de tu fútbol, cargá el plantel e invitá a tus amigos por WhatsApp."
              action={
                <Button asChild size="lg">
                  <Link href={routes.newGroup} transitionTypes={["nav-forward"]}>
                    <Plus aria-hidden="true" />
                    Crear mi grupo
                  </Link>
                </Button>
              }
            />
            <EmptyState
              icon={Link2}
              tone="neutral"
              title="¿Te invitaron?"
              description="Pegá el link que te pasaron: te suma al grupo y vincula tu ficha."
              action={<InviteLinkInput />}
            />
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {groups.map((group) => (
              <li key={group.id}>
                <GroupCard group={group} />
              </li>
            ))}
            <li>
              <Link
                href={routes.newGroup}
                transitionTypes={["nav-forward"]}
                className="pressable relative flex min-h-20 items-center justify-center gap-2 rounded-xl border border-dashed border-hairline px-4 text-sm font-medium text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <Plus className="size-5" aria-hidden="true" />
                Crear otro grupo
                <LinkPending />
              </Link>
            </li>
          </ul>
        )}
      </div>
    </ScreenTransition>
  );
}
