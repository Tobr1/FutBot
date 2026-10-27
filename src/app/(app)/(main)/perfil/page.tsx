import { KeyRound, LogOut } from "lucide-react";
import type { Metadata } from "next";
import { StackHeader } from "@/components/layout/stack-header";
import { ScreenTransition } from "@/components/motion/screen-transition";
import { InstallAppRow } from "@/components/pwa/install-app-row";
import { ListGroup, ListRow } from "@/components/shared/list-group";
import { SectionHeader } from "@/components/shared/section-header";
import { signOutAction } from "@/features/auth/actions";
import { PushSettings } from "@/features/notifications/components/push-settings";
import { getNotificationPreferences } from "@/features/notifications/queries";
import { isPushConfigured } from "@/features/notifications/send";
import { AvatarUploader } from "@/features/profile/components/avatar-uploader";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { getCurrentProfile } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const [profile, preferences] = await Promise.all([getCurrentProfile(), getNotificationPreferences()]);

  return (
    <ScreenTransition>
      <div className="mx-auto max-w-2xl space-y-6">
        <StackHeader backHref={routes.dashboard} backLabel="Mis grupos" title={profile.displayName} />

        <header className="flex flex-col items-center gap-3 pt-2 text-center lg:flex-row lg:items-center lg:gap-5 lg:pt-0 lg:text-left">
          <AvatarUploader userId={profile.id} name={profile.displayName} avatarUrl={profile.avatarUrl} />
          <div className="min-w-0 max-w-full space-y-1 lg:self-start lg:pt-4">
            <h1
              id="page-title"
              className="font-display text-display-md font-extrabold tracking-wide wrap-break-word uppercase"
            >
              {profile.displayName}
            </h1>
            {profile.email && <p className="truncate text-sm text-muted-foreground">{profile.email}</p>}
          </div>
        </header>

        <section aria-labelledby="datos" className="lg:panel lg:rounded-xl lg:p-6">
          <SectionHeader id="datos" title="Datos" className="mb-2" />
          <ProfileForm displayName={profile.displayName} />
        </section>

        <section aria-labelledby="avisos">
          <SectionHeader id="avisos" title="Avisos al celular" />
          <PushSettings preferences={preferences} configured={isPushConfigured()} />
        </section>

        <section aria-labelledby="cuenta">
          <SectionHeader id="cuenta" title="Cuenta" />
          <form id="sign-out-form" action={signOutAction} hidden />
          <ListGroup>
            <ListRow
              href={routes.resetPassword}
              transitionTypes={["nav-forward"]}
              leading={<KeyRound className="size-5 text-muted-foreground" aria-hidden="true" />}
              title="Cambiar contraseña"
              chevron
            />
            <InstallAppRow />
            <ListRow
              asChild
              destructive
              leading={<LogOut className="size-5 text-destructive" aria-hidden="true" />}
              title="Cerrar sesión"
            >
              <button type="submit" form="sign-out-form" />
            </ListRow>
          </ListGroup>
        </section>
      </div>
    </ScreenTransition>
  );
}
