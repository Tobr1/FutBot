import { ListChecks } from "lucide-react";
import type { Metadata } from "next";
import { EmptyState } from "@/components/shared/empty-state";
import { SectionHeader } from "@/components/shared/section-header";
import { SettingsShell } from "@/features/groups/components/settings-shell";
import { getGroupContext } from "@/features/groups/queries";
import { listPlayers } from "@/features/players/queries";
import { TeamRuleForm, TeamRuleList } from "@/features/teams/components/team-rules";
import { listTeamRules } from "@/features/teams/queries";

export const metadata: Metadata = { title: "Reglas de armado" };

export default async function TeamRulesPage({ params }: PageProps<"/g/[slug]/ajustes/reglas">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  const [rules, players] = await Promise.all([listTeamRules(ctx.group.id), listPlayers(ctx.group.id)]);

  const byId = Object.fromEntries(players.map((p) => [p.id, { nickname: p.nickname, avatarUrl: p.avatarUrl }]));
  const pickable = players
    .filter((p) => p.isActive)
    .map((p) => ({ id: p.id, nickname: p.nickname, fullName: p.fullName, avatarUrl: p.avatarUrl }));

  return (
    <SettingsShell
      slug={slug}
      title="Reglas de armado"
      description="Parejas que juegan siempre juntas o separadas cuando se generan equipos."
    >
      <section aria-labelledby="reglas-lista" className="space-y-1">
        <SectionHeader id="reglas-lista" title="Reglas" count={rules.length} />
        {rules.length === 0 ? (
          <EmptyState
            size="sm"
            icon={ListChecks}
            title="Sin reglas"
            description={
              ctx.isAdmin
                ? "Por ejemplo: dos que vienen juntos en auto, o dos que mejor no compartan equipo."
                : "Un admin todavía no cargó reglas."
            }
          />
        ) : (
          <TeamRuleList groupId={ctx.group.id} rules={rules} players={byId} canEdit={ctx.isAdmin} />
        )}
        {!ctx.isAdmin && rules.length > 0 && (
          <p className="px-1 pt-2 text-xs text-muted-foreground">Solo un admin puede cambiar las reglas.</p>
        )}
      </section>

      {ctx.isAdmin && (
        <section aria-labelledby="reglas-nueva" className="space-y-3 lg:panel lg:rounded-xl lg:p-6">
          <div>
            <SectionHeader id="reglas-nueva" title="Nueva regla" />
            <p className="text-sm text-muted-foreground">Al generar equipos se cumple siempre; armando a mano, no.</p>
          </div>
          <TeamRuleForm groupId={ctx.group.id} players={pickable} />
        </section>
      )}
    </SettingsShell>
  );
}
