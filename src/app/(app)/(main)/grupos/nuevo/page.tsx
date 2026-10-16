import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { FormSkeleton } from "@/components/shared/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { CreateGroupForm } from "@/features/groups/components/create-group-form";
import { getCurrentProfile } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Crear grupo" };

export default function NewGroupPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        eyebrow="Nuevo grupo"
        title="Crear grupo"
        description="Vas a ser administrador: cargás jugadores, armás partidos e invitás al resto."
      />
      <Card>
        <CardContent>
          <Suspense fallback={<FormSkeleton />}>
            <CreateGroupFormWithDefaults />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function CreateGroupFormWithDefaults() {
  const profile = await getCurrentProfile();
  return <CreateGroupForm defaultNickname={profile.displayName.split(" ")[0]} />;
}
