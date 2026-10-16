import { Link2, Plus, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { FlashToast } from "@/components/shared/flash-toast";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { GroupCard } from "@/features/groups/components/group-card";
import { getMyGroups } from "@/features/groups/queries";
import { getCurrentProfile } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Mis grupos" };

const FLASH = { clave: { actualizada: "Contraseña actualizada." } };

export default async function DashboardPage() {
  const [profile, groups] = await Promise.all([getCurrentProfile(), getMyGroups()]);
  const firstName = profile.displayName.split(" ")[0];

  return (
    <div className="space-y-8">
      <Suspense fallback={null}>
        <FlashToast messages={FLASH} />
      </Suspense>

      <PageHeader
        eyebrow={`Hola, ${firstName}`}
        title="Mis grupos"
        description="Elegí un grupo para ver su plantel, partidos y rankings."
        actions={
          groups.length > 0 && (
            <Button asChild>
              <Link href={routes.newGroup}>
                <Plus aria-hidden="true" />
                Crear grupo
              </Link>
            </Button>
          )
        }
      />

      {groups.length === 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <EmptyState
            icon={Users}
            title="Armá tu grupo"
            description="Creá el grupo de tu fútbol, cargá el plantel e invitá a tus amigos por WhatsApp."
            action={
              <Button asChild size="lg">
                <Link href={routes.newGroup}>
                  <Plus aria-hidden="true" />
                  Crear mi grupo
                </Link>
              </Button>
            }
          />
          <EmptyState
            icon={Link2}
            title="¿Te invitaron?"
            description="Abrí el link de invitación que te pasaron: te suma al grupo y vincula tu ficha."
          />
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {groups.map((group) => (
            <li key={group.id}>
              <GroupCard group={group} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
