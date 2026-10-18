import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";
import { getGroupContext } from "@/features/groups/queries";

export const metadata: Metadata = { title: "Rankings" };

export default async function RankingsPage({ params }: PageProps<"/g/[slug]/rankings">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={ctx.group.name} title="Rankings" description="Los mejores del grupo, con mínimos de partidos para que sea justo." />
      <ComingSoon
        icon={Trophy}
        title="Rankings en camino"
        items={[
          "Mejor jugador, goleador, asistidor y más MVP.",
          "Mejor promedio, más regular y mejor momento.",
          `Filtros por temporada y mínimo de ${ctx.group.ranking_min_matches} partidos.`,
        ]}
      />
    </div>
  );
}
