import { Trophy } from "lucide-react";
import type { Metadata } from "next";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";
import { RankingsPreview } from "@/features/groups/components/coming-soon-previews";
import { getGroupContext } from "@/features/groups/queries";

export const metadata: Metadata = { title: "Rankings" };

export default async function RankingsPage({ params }: PageProps<"/g/[slug]/rankings">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);
  const minMatches = ctx.group.ranking_min_matches;

  return (
    <ScreenTransition>
      <div className="space-y-6">
        <PageHeader title="Rankings" description="Los mejores del grupo, con mínimos para que sea justo." />
        <ComingSoon
          icon={Trophy}
          title="Rankings en camino"
          preview={<RankingsPreview />}
          items={[
            "Mejor jugador, goleador, asistidor y más MVP.",
            "Mejor promedio, más regular y mejor momento.",
            `Filtros por temporada y mínimo de ${minMatches} ${minMatches === 1 ? "partido" : "partidos"} para entrar.`,
          ]}
        />
      </div>
    </ScreenTransition>
  );
}
