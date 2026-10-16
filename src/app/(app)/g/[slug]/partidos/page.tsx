import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";
import { getGroupContext } from "@/features/groups/queries";

export const metadata: Metadata = { title: "Partidos" };

export default async function MatchesPage({ params }: PageProps<"/g/[slug]/partidos">) {
  const { slug } = await params;
  const ctx = await getGroupContext(slug);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={ctx.group.name} title="Partidos" description="Próximos partidos, resultados e historial." />
      <ComingSoon
        icon={CalendarDays}
        title="Partidos en camino"
        phase="Fase 2"
        items={[
          "Crear partidos con fecha, hora, cancha y formato.",
          "Pegar la lista de WhatsApp y reconocer a cada jugador.",
          "Armar los equipos y cargar resultado, goles y asistencias.",
        ]}
      />
    </div>
  );
}
