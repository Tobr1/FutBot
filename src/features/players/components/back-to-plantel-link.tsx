"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

/**
 * Botón "Ver plantel" para el not-found de la ficha. Lee el slug de la URL
 * (useParams), así que quien lo use tiene que envolverlo en <Suspense>.
 */
export function BackToPlantelLink() {
  const params = useParams<{ slug: string }>();
  const href = params?.slug ? routes.groupPlayers(params.slug) : routes.dashboard;

  return (
    <Button asChild size="lg">
      <Link href={href} transitionTypes={["nav-back"]}>
        Ver plantel
      </Link>
    </Button>
  );
}
