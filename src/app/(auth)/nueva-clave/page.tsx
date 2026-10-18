import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthHeading } from "@/features/auth/components/auth-heading";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeading title="Nueva contraseña" description="Elegí una contraseña que no uses en otros sitios." />
      {/* El formulario sin email ya va en el HTML; con la sesión se suma el usuario para el gestor de contraseñas. */}
      <Suspense fallback={<ResetPasswordForm />}>
        <ResetPasswordFormWithEmail />
      </Suspense>
    </>
  );
}

async function ResetPasswordFormWithEmail() {
  const user = await getSessionUser();
  return <ResetPasswordForm email={user?.email} />;
}
