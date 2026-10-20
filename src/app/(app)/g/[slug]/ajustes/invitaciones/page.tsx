import { Link2, Mailbox } from "lucide-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { AccessDenied } from "@/components/shared/access-denied";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeader } from "@/components/shared/section-header";
import { SettingsShell } from "@/features/groups/components/settings-shell";
import { getGroupContext } from "@/features/groups/queries";
import { CreateInvitation } from "@/features/invitations/components/create-invitation";
import { InvitationList } from "@/features/invitations/components/invitation-list";
import { ShareInvite } from "@/features/invitations/components/share-invite";
import { type InvitationRow, listInvitations } from "@/features/invitations/queries";
import { formatDate } from "@/lib/format";
import { getRequestOrigin } from "@/lib/origin";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Invitaciones" };

function usesLabel(inv: InvitationRow) {
  const count = `${inv.useCount}${inv.maxUses ? `/${inv.maxUses}` : ""}`;
  return `${count} ${inv.useCount === 1 && !inv.maxUses ? "uso" : "usos"}`;
}

export default async function InvitationsPage({ params }: PageProps<"/g/[slug]/ajustes/invitaciones">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  if (!ctx.isAdmin) return <AccessDenied backHref={routes.groupSettings(slug)} />;

  await connection();
  const [invitations, origin] = await Promise.all([listInvitations(ctx.group.id, new Date()), getRequestOrigin()]);

  // El link "del grupo": la invitación general de jugador más reciente que sigue activa.
  const groupLink = invitations.find((inv) => inv.status === "valid" && inv.role === "player" && !inv.playerNickname);
  const active = invitations.filter((inv) => inv.status === "valid");
  const inactive = invitations.filter((inv) => inv.status !== "valid");
  const shareMessage = `Sumate a "${ctx.group.name}" en FulBot:`;

  return (
    <SettingsShell slug={slug} title="Invitaciones" description="Mandá el link por WhatsApp para sumar gente.">
      <section aria-labelledby="link-del-grupo" className="panel space-y-3 rounded-xl p-4">
        <div className="flex items-center gap-2">
          <Link2 className="size-4 text-primary" aria-hidden="true" />
          <h2 id="link-del-grupo" className="text-base font-semibold tracking-tight">
            Link del grupo
          </h2>
        </div>
        {groupLink ? (
          <>
            <ShareInvite url={`${origin}${routes.invitation(groupLink.token)}`} message={shareMessage} />
            <p className="text-xs text-muted-foreground">
              {groupLink.expiresAt ? `Vence ${formatDate(groupLink.expiresAt)}` : "Sin vencimiento"} · {usesLabel(groupLink)}
            </p>
            <details className="group/other border-t border-hairline pt-1">
              <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-medium text-muted-foreground select-none [&::-webkit-details-marker]:hidden">
                Crear otro link
              </summary>
              <div className="pt-2">
                <CreateInvitation groupId={ctx.group.id} groupName={ctx.group.name} />
              </div>
            </details>
          </>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Generá un link y pegalo en el grupo de WhatsApp. Para vincular una ficha puntual, usá “Invitar a vincular” desde
              su ficha.
            </p>
            <CreateInvitation groupId={ctx.group.id} groupName={ctx.group.name} />
          </>
        )}
      </section>

      {invitations.length === 0 ? (
        <EmptyState size="sm" tone="neutral" icon={Mailbox} title="Sin invitaciones" description="Los links que generes aparecen acá." />
      ) : (
        <>
          <section aria-labelledby="invitaciones-activas" className="space-y-1">
            <SectionHeader id="invitaciones-activas" title="Activas" count={active.length} />
            {active.length > 0 ? (
              <InvitationList invitations={active} origin={origin} groupName={ctx.group.name} />
            ) : (
              <EmptyState size="sm" tone="neutral" icon={Mailbox} title="No hay links activos" />
            )}
          </section>

          {inactive.length > 0 && (
            <details className="group/inactive space-y-2">
              <summary className="flex min-h-11 cursor-pointer list-none items-center text-sm font-medium text-muted-foreground select-none [&::-webkit-details-marker]:hidden">
                Vencidas y revocadas ({inactive.length})
              </summary>
              <InvitationList invitations={inactive} origin={origin} groupName={ctx.group.name} />
            </details>
          )}
        </>
      )}
    </SettingsShell>
  );
}
