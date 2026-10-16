import { CircleSlash, Shield, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { SetupNotice } from "@/components/shared/setup-notice";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AcceptInvitationButton } from "@/features/invitations/components/accept-invitation-button";
import { getInvitationPreview } from "@/features/invitations/queries";
import { INVITATION_STATUS_LABELS } from "@/features/invitations/status";
import { getSessionUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Invitación", robots: { index: false } };

export default function InvitationPage({ params }: PageProps<"/invitacion/[token]">) {
  return (
    <div className="flex min-h-dvh flex-col items-center px-4 py-8">
      <Link href={routes.home} aria-label="FUTBOLEROS, inicio" className="mb-10">
        <Logo />
      </Link>
      <div className="w-full max-w-md space-y-4">
        <SetupNotice />
        <div className="pitch-lines overflow-hidden rounded-3xl border border-border bg-card/80 p-6 shadow-2xl sm:p-8">
          <Suspense fallback={<InvitationSkeleton />}>
            <InvitationContent params={params} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

async function InvitationContent({ params }: { params: PageProps<"/invitacion/[token]">["params"] }) {
  const { token } = await params;
  const [preview, user] = await Promise.all([getInvitationPreview(token), getSessionUser()]);

  if (!preview) {
    return (
      <Message
        icon={CircleSlash}
        title="Invitación inválida"
        text="El link no existe o está incompleto. Pedile a quien te invitó que te lo mande de nuevo."
      />
    );
  }

  if (preview.isMember) {
    return (
      <div className="space-y-6 text-center">
        <Message icon={Users} title="Ya sos parte" text={`Ya estás en ${preview.groupName}.`} />
        <Button size="lg" className="w-full" asChild>
          <Link href={routes.group(preview.groupSlug)}>Ir al grupo</Link>
        </Button>
      </div>
    );
  }

  if (preview.status !== "valid") {
    return (
      <Message
        icon={CircleSlash}
        title={`Invitación ${INVITATION_STATUS_LABELS[preview.status].toLowerCase()}`}
        text="Este link ya no sirve. Pedile uno nuevo a un administrador del grupo."
      />
    );
  }

  const next = routes.invitation(token);

  return (
    <div className="space-y-6">
      <div className="space-y-3 text-center">
        <p className="text-sm text-muted-foreground">
          {preview.inviterName ? `${preview.inviterName} te invita a` : "Te invitaron a"}
        </p>
        <h1 className="font-display text-4xl leading-none font-extrabold tracking-wide uppercase">{preview.groupName}</h1>
        <div className="flex flex-wrap justify-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-medium text-primary">
            {preview.role === "admin" ? <Shield className="size-3.5" aria-hidden="true" /> : <Users className="size-3.5" aria-hidden="true" />}
            {preview.role === "admin" ? "Como administrador" : "Como jugador"}
          </span>
          {preview.playerNickname && (
            <span className="rounded-full bg-gold/15 px-2.5 py-1 text-xs font-medium text-gold">Ficha: {preview.playerNickname}</span>
          )}
        </div>
        {preview.playerNickname && (
          <p className="text-sm text-muted-foreground">Al aceptar, la ficha de {preview.playerNickname} queda vinculada a tu cuenta.</p>
        )}
      </div>

      {user ? (
        <AcceptInvitationButton token={token} groupName={preview.groupName} />
      ) : (
        <div className="grid gap-2">
          <Button size="lg" asChild>
            <Link href={`${routes.signup}?next=${encodeURIComponent(next)}`}>Crear cuenta y unirme</Link>
          </Button>
          <Button size="lg" variant="secondary" asChild>
            <Link href={`${routes.login}?next=${encodeURIComponent(next)}`}>Ya tengo cuenta</Link>
          </Button>
        </div>
      )}
    </div>
  );
}

function Message({ icon: Icon, title, text }: { icon: typeof Users; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h1 className="font-display text-3xl font-extrabold tracking-wide uppercase">{title}</h1>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function InvitationSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="space-y-3">
        <Skeleton className="mx-auto h-4 w-32" />
        <Skeleton className="mx-auto h-10 w-56" />
        <Skeleton className="mx-auto h-6 w-36 rounded-full" />
      </div>
      <Skeleton className="h-12 rounded-xl" />
    </div>
  );
}
