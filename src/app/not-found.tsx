import { Compass } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4">
      <Logo />
      <EmptyState
        icon={Compass}
        title="Fuera de la cancha"
        description="La página no existe o no tenés acceso. Si es un grupo, pedí una invitación a un administrador."
        action={
          <Button asChild>
            <Link href={routes.dashboard}>Ir a mis grupos</Link>
          </Button>
        }
        className="w-full max-w-md"
      />
    </div>
  );
}
