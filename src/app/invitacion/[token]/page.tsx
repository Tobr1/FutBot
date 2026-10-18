import { BarChart3, CircleSlash, type LucideIcon, Scale, Shield, Trophy, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Logo } from "@/components/brand/logo";
import { GroupCrest } from "@/components/shared/group-crest";
import { SetupNotice } from "@/components/shared/setup-notice";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AcceptInvitationButton } from "@/features/invitations/components/accept-invitation-button";
import { getInvitationPreview, type InvitationPreview } from "@/features/invitations/queries";
import { INVITATION_STATUS_LABELS } from "@/features/invitations/status";
import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

const SHARE_DESCRIPTION = "Sumate en FUTBOLEROS: estadísticas, rankings y equipos parejos.";

// Metadata estática a propósito: no consultamos el token para armar la vista previa del link.
export const metadata: Metadata = {
  title: "Te invitaron a un grupo",
  description: SHARE_DESCRIPTION,
  robots: { index: false },
  openGraph: { title: "Te invitaron a un grupo de FUTBOLEROS", description: SHARE_DESCRIPTION },
};

const WHAT_IS = [
  { icon: Scale, label: "Equipos parejos" },
  { icon: BarChart3, label: "Tus estadísticas" },
  { icon: Trophy, label: "Rankings" },
];

export default function InvitationPage({ params }: PageProps<"/invitacion/[token]">) {
  return (
    <main
      id="main"
      tabIndex={-1}
      className="flex min-h-dvh flex-col items-center px-4 pt-[max(2rem,var(--safe-top))] pb-[max(2rem,var(--safe-bottom))] outline-none"
    >
      <Link href={routes.home} aria-label="FUTBOLEROS, inicio" className="mb-6">
        <Logo />
      </Link>
      <div className="w-full max-w-md space-y-4">
        <SetupNotice />
        <div className="pitch-lines panel-raised overflow-hidden rounded-2xl p-6 sm:p-8">
          <Suspense fallback={<InvitationSkeleton />}>
            <InvitationContent params={params} />
          </Suspense>
        </div>
      </div>
    </main>
  );
}

async function InvitationContent({ params }: { params: PageProps<"/invitacion/[token]">["params"] }) {
  const { token } = await params;
  const [preview, user] = await Promise.all([getInvitationPreview(token), getSessionUser()]);

  if (!preview) {
    return (
      <div className="space-y-6">
        <Message
          icon={CircleSlash}
          title="Invitación inválida"
          text="El link no existe o está incompleto. Pedile a quien te invitó que te lo mande de nuevo."
        />
        <ExitActions user={user} />
      </div>
    );
  }

  if (preview.isMember) {
    return (
      <div className="space-y-6">
        <Message icon={Users} title="Ya sos parte" text={`Ya estás en ${preview.groupName}.`} />
        <Button size="lg" className="w-full" asChild>
          <Link href={routes.group(preview.groupSlug)}>Ir al grupo</Link>
        </Button>
      </div>
    );
  }

  if (preview.status !== "valid") {
    return (
      <div className="space-y-6">
        <Message
          icon={CircleSlash}
          title={`Invitación ${INVITATION_STATUS_LABELS[preview.status].toLowerCase()}`}
          text={unusableText(preview)}
        />
        <ExitActions user={user} />
      </div>
    );
  }

  const next = routes.invitation(token);

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <GroupCrest name={preview.groupName} size="lg" />
        <div className="space-y-1.5">
          <p className="text-sm text-muted-foreground">
            {preview.inviterName ? (
              <>
                Te invita <span className="font-semibold text-foreground">{preview.inviterName}</span>
              </>
            ) : (
              "Te invitaron a"
            )}
          </p>
          <h1 className="font-display text-display-lg font-extrabold tracking-wide break-words uppercase">
            {preview.groupName}
          </h1>
        </div>
        {preview.role === "admin" && (
          <Badge tone="primary">
            <Shield aria-hidden="true" />
            Te suman como admin
          </Badge>
        )}
      </div>

      {preview.playerNickname && (
        <div className="panel flex items-center gap-3.5 rounded-xl p-4">
          <UserAvatar name={preview.playerNickname} size="lg" />
          <div className="min-w-0">
            <p className="text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Tu ficha ya está cargada</p>
            <p className="truncate font-display text-xl leading-tight font-extrabold tracking-wide uppercase">
              {preview.playerNickname}
            </p>
            <p className="text-xs text-muted-foreground">Al aceptar queda vinculada a tu cuenta.</p>
          </div>
        </div>
      )}

      {user ? (
        <AcceptInvitationButton token={token} groupName={preview.groupName} />
      ) : (
        <div className="grid gap-2">
          <Button size="lg" className="w-full" asChild>
            <Link href={`${routes.signup}?next=${encodeURIComponent(next)}`}>Crear cuenta y unirme</Link>
          </Button>
          <Button size="lg" variant="secondary" className="w-full" asChild>
            <Link href={`${routes.login}?next=${encodeURIComponent(next)}`}>Ya tengo cuenta</Link>
          </Button>
        </div>
      )}

      <section aria-labelledby="what-is-title" className="border-t border-hairline pt-5">
        <h2
          id="what-is-title"
          className="text-center text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase"
        >
          Qué es FUTBOLEROS
        </h2>
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {WHAT_IS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex flex-col items-center gap-2 text-center text-xs text-muted-foreground">
              <span className="grid size-9 place-items-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/25">
                <Icon className="size-[18px]" aria-hidden="true" />
              </span>
              {label}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function unusableText(preview: InvitationPreview): string {
  const reason =
    preview.status === "expired"
      ? "Este link ya venció."
      : preview.status === "exhausted"
        ? "Este link ya se usó todas las veces permitidas."
        : "Un administrador dio de baja este link.";
  const ask = preview.inviterName
    ? `Pedile a ${preview.inviterName} un link nuevo.`
    : "Pedile uno nuevo a un administrador del grupo.";
  return `${reason} ${ask}`;
}

/** Salidas para los estados sin invitación usable: nunca un callejón sin salida. */
function ExitActions({ user }: { user: SessionUser | null }) {
  if (!user) {
    return (
      <Button size="lg" className="w-full" asChild>
        <Link href={routes.home}>Ir a FUTBOLEROS</Link>
      </Button>
    );
  }
  return (
    <div className="grid gap-2">
      <Button size="lg" className="w-full" asChild>
        <Link href={routes.dashboard}>Ir a mis grupos</Link>
      </Button>
      <Button size="lg" variant="secondary" className="w-full" asChild>
        <Link href={routes.home}>Ir a FUTBOLEROS</Link>
      </Button>
    </div>
  );
}

function Message({ icon: Icon, title, text }: { icon: LucideIcon; title: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-surface-3 text-muted-foreground ring-1 ring-hairline">
        <Icon className="size-7" aria-hidden="true" />
      </span>
      <h1 className="font-display text-display-md font-extrabold tracking-wide uppercase sm:text-3xl">{title}</h1>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function InvitationSkeleton() {
  return (
    <div className="space-y-6" aria-hidden="true">
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-16 rounded-[28%_28%_46%_46%]" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-8 w-56" />
      </div>
      <Skeleton className="h-[5.5rem] rounded-xl" />
      <div className="grid gap-2">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-2 border-t border-hairline pt-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex flex-col items-center gap-2">
            <Skeleton className="size-9 rounded-lg" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
