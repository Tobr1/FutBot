import type { Metadata } from "next";
import { Suspense } from "react";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { AccessDenied } from "@/components/shared/access-denied";
import { PageHeader } from "@/components/shared/page-header";
import { FormSkeleton } from "@/components/shared/skeletons";
import { CreateGroupForm } from "@/features/groups/components/create-group-form";
import { getIsAppAdmin } from "@/features/groups/queries";
import { getCurrentProfile } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Crear grupo" };

export default function NewGroupPage() {
  return (
    <ScreenTransition>
      <div className="mx-auto max-w-2xl space-y-6">
        <StackHeader backHref={routes.dashboard} backLabel="Mis grupos" title="Crear grupo" />
        <PageHeader title="Crear grupo" description="Vas a ser administrador del grupo." />
        {/* Sin Card ni overflow-hidden: la barra de acciones tiene que poder pegarse abajo. */}
        <div className="lg:panel lg:rounded-xl lg:p-6">
          <Suspense fallback={<FormSkeleton />}>
            <CreateGroupFormWithDefaults />
          </Suspense>
        </div>
      </div>
    </ScreenTransition>
  );
}

async function CreateGroupFormWithDefaults() {
  const [profile, isAppAdmin] = await Promise.all([getCurrentProfile(), getIsAppAdmin()]);
  if (!isAppAdmin) {
    return <AccessDenied backHref={routes.dashboard} message="Por ahora solo el administrador de FutBot crea grupos. Pedile un link de invitación." />;
  }
  return <CreateGroupForm defaultNickname={profile.displayName.split(" ")[0]} />;
}
