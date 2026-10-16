import { Mailbox } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { AccessDenied } from "@/components/shared/access-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsShell } from "@/features/groups/components/settings-shell";
import { getGroupContext } from "@/features/groups/queries";
import { CreateInvitation } from "@/features/invitations/components/create-invitation";
import { InvitationList } from "@/features/invitations/components/invitation-list";
import { listInvitations } from "@/features/invitations/queries";
import { getRequestOrigin } from "@/lib/origin";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Invitaciones" };

export default async function InvitationsPage({ params }: PageProps<"/g/[slug]/ajustes/invitaciones">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  if (!ctx.isAdmin) return <AccessDenied backHref={routes.groupSettings(slug)} />;

  await connection();
  const [invitations, origin] = await Promise.all([listInvitations(ctx.group.id, new Date()), getRequestOrigin()]);

  return (
    <SettingsShell ctx={ctx} title="Invitaciones" description="Links para sumar gente al grupo. Compartilos por WhatsApp.">
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg font-bold uppercase">Nuevo link</CardTitle>
          <CardDescription>
            Para vincular a alguien con una ficha ya cargada, entrá a su ficha y usá “Invitar a vincular”.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateInvitation groupId={ctx.group.id} groupName={ctx.group.name} />
        </CardContent>
      </Card>

      <section aria-labelledby="invitations-title" className="space-y-3">
        <h2 id="invitations-title" className="font-display text-xl font-bold tracking-wide uppercase">
          Historial
        </h2>
        {invitations.length === 0 ? (
          <EmptyState icon={Mailbox} title="Sin invitaciones" description="Los links que generes aparecen acá." />
        ) : (
          <InvitationList invitations={invitations} origin={origin} />
        )}
      </section>
    </SettingsShell>
  );
}
