import { CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { ComingSoon } from "@/components/shared/coming-soon";
import { PageHeader } from "@/components/shared/page-header";
import { MatchesPreview } from "@/features/groups/components/coming-soon-previews";
import { getGroupContext } from "@/features/groups/queries";

export const metadata: Metadata = { title: "Partidos" };

export default async function MatchesPage({ params }: PageProps<"/g/[slug]/partidos">) {
  const { slug } = await params;
  // Valida la membresía (404 si no sos del grupo).
  await getGroupContext(slug);

  return (
    <ScreenTransition>
      <div className="space-y-6">
        <PageHeader title="Partidos" description="Próximos partidos, resultados e historial." />
        <ComingSoon
          icon={CalendarDays}
          title="Partidos en camino"
          preview={<MatchesPreview />}
          items={[
            "Crear partidos con fecha, hora, cancha y formato.",
            "Pegar la lista de WhatsApp y reconocer a cada jugador.",
            "Armar los equipos y cargar resultado, goles y asistencias.",
          ]}
        />
      </div>
    </ScreenTransition>
  );
}
