import type { Metadata } from "next";
import { AuthHeading } from "@/features/auth/components/auth-heading";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";

export const metadata: Metadata = { title: "Nueva contraseña" };

export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeading title="Nueva contraseña" description="Elegí una contraseña que no uses en otros sitios." />
      <ResetPasswordForm />
    </>
  );
}
