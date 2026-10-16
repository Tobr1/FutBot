import { KeyRound, LogOut } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { signOutAction } from "@/features/auth/actions";
import { AvatarUploader } from "@/features/profile/components/avatar-uploader";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { getCurrentProfile } from "@/lib/auth/session";
import { routes } from "@/lib/routes";

export const metadata: Metadata = { title: "Mi perfil" };

export default async function ProfilePage() {
  const profile = await getCurrentProfile();

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Cuenta" title="Mi perfil" description="Tus datos personales. Las fichas deportivas son por grupo." />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-lg font-bold uppercase">Datos</CardTitle>
            <CardDescription>Tu foto y nombre se muestran en todos tus grupos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <AvatarUploader userId={profile.id} name={profile.displayName} avatarUrl={profile.avatarUrl} />
            <ProfileForm displayName={profile.displayName} email={profile.email} />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="font-display text-lg font-bold uppercase">Seguridad</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            <Button variant="secondary" asChild className="justify-start">
              <Link href={routes.resetPassword}>
                <KeyRound aria-hidden="true" />
                Cambiar contraseña
              </Link>
            </Button>
            <form action={signOutAction}>
              <Button type="submit" variant="destructive" className="w-full justify-start">
                <LogOut aria-hidden="true" />
                Cerrar sesión
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
