import type { Metadata } from "next";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { GroupSettingsForm } from "@/features/groups/components/group-settings-form";
import { SettingsShell } from "@/features/groups/components/settings-shell";
import { getGroupContext } from "@/features/groups/queries";

export const metadata: Metadata = { title: "Datos del grupo" };

export default async function GroupGeneralSettingsPage({ params }: PageProps<"/g/[slug]/ajustes/general">) {
  const { slug } = await params;
  const { group, isAdmin } = await getGroupContext(slug);

  return (
    <SettingsShell slug={slug} title="Datos del grupo">
      {isAdmin ? (
        // Sin Card: la barra de acciones tiene que quedar pegada abajo en el teléfono.
        <div className="lg:panel lg:rounded-xl lg:p-6">
          <GroupSettingsForm group={group} />
        </div>
      ) : (
        <ListGroup label="Datos del grupo">
          <ListRow title="Nombre" subtitle={group.name} />
          <ListRow
            title="Formato"
            subtitle={`${group.default_players_per_team} vs ${group.default_players_per_team}`}
          />
          <ListRow title="Votación" subtitle={`${group.voting_window_hours} horas`} />
          <ListRow
            title="Mínimo para rankings"
            subtitle={`${group.ranking_min_matches} ${group.ranking_min_matches === 1 ? "partido" : "partidos"}`}
          />
          {group.description && (
            // Sin truncar: la descripción puede ocupar varias líneas.
            <ListRow title="Descripción">
              <span className="mt-0.5 block text-xs whitespace-pre-line text-muted-foreground">{group.description}</span>
            </ListRow>
          )}
        </ListGroup>
      )}
    </SettingsShell>
  );
}
