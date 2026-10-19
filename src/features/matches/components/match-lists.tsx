"use client";

import type { ReactNode } from "react";
import { SegmentedContent, SegmentedList, SegmentedTabs, SegmentedTrigger } from "@/components/shared/segmented-tabs";

/**
 * Pestañas "Próximos / Jugados" de la lista de partidos. El contenido de
 * cada una llega renderizado del servidor; acá solo se alterna.
 */
export function MatchLists({
  upcoming,
  past,
  upcomingCount,
  pastCount,
}: {
  upcoming: ReactNode;
  past: ReactNode;
  upcomingCount: number;
  pastCount: number;
}) {
  // Sin próximos pero con jugados: arranca en "Jugados".
  const defaultValue = upcomingCount === 0 && pastCount > 0 ? "jugados" : "proximos";
  return (
    <SegmentedTabs defaultValue={defaultValue}>
      <SegmentedList label="Partidos" className="lg:max-w-sm">
        <SegmentedTrigger value="proximos" count={upcomingCount}>
          Próximos
        </SegmentedTrigger>
        <SegmentedTrigger value="jugados" count={pastCount}>
          Jugados
        </SegmentedTrigger>
      </SegmentedList>
      <SegmentedContent value="proximos">{upcoming}</SegmentedContent>
      <SegmentedContent value="jugados">{past}</SegmentedContent>
    </SegmentedTabs>
  );
}
