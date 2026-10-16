import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupSettingsForm } from "@/features/groups/components/group-settings-form";
import { LeaveGroupButton } from "@/features/groups/components/leave-group-button";
import { SettingsShell } from "@/features/groups/components/settings-shell";
import { getGroupContext } from "@/features/groups/queries";

export const metadata: Metadata = { title: "Ajustes del grupo" };

export default async function GroupSettingsPage({ params }: PageProps<"/g/[slug]/ajustes">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  const { group } = ctx;

  return (
    <SettingsShell ctx={ctx} title="Grupo" description={ctx.isAdmin ? "Datos y reglas del grupo." : "Datos y reglas del grupo (solo lectura)."}>
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-lg font-bold uppercase">General</CardTitle>
        </CardHeader>
        <CardContent>
          {ctx.isAdmin ? (
            <GroupSettingsForm group={group} />
          ) : (
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
              <ReadOnly label="Nombre" value={group.name} />
              <ReadOnly label="Formato habitual" value={`${group.default_players_per_team} vs ${group.default_players_per_team}`} />
              <ReadOnly label="Duración de la votación" value={`${group.voting_window_hours} horas`} />
              <ReadOnly label="Partidos mínimos para rankings" value={String(group.ranking_min_matches)} />
              {group.description && <ReadOnly label="Descripción" value={group.description} className="sm:col-span-2" />}
            </dl>
          )}
        </CardContent>
      </Card>

      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle className="font-display text-lg font-bold text-destructive uppercase">Zona de riesgo</CardTitle>
          <CardDescription>
            {ctx.isAdmin
              ? "Si sos el único administrador, primero designá a otra persona en Miembros."
              : "Podés volver a entrar con una nueva invitación."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeaveGroupButton groupId={group.id} groupName={group.name} />
        </CardContent>
      </Card>
    </SettingsShell>
  );
}

function ReadOnly({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
