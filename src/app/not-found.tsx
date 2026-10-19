import { Compass } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export default function NotFound() {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 pt-[max(2rem,var(--safe-top))] pb-[max(2rem,var(--safe-bottom))] outline-none"
    >
      <Link href={routes.home} aria-label="FutBot, inicio">
        <Logo />
      </Link>
      <EmptyState
        icon={Compass}
        size="lg"
        headingLevel="h1"
        title="Fuera de la cancha"
        description="La página no existe o no tenés acceso. Si es un grupo, pedí una invitación a un administrador."
        action={
          <div className="grid w-full max-w-xs gap-2">
            <Button size="lg" className="w-full" asChild>
              <Link href={routes.dashboard}>Ir a mis grupos</Link>
            </Button>
            <Button size="lg" variant="secondary" className="w-full" asChild>
              <Link href={routes.home}>Ir al inicio</Link>
            </Button>
          </div>
        }
        className="w-full max-w-md"
      />
    </main>
  );
}
