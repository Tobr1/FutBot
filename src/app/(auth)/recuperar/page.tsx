import type { Metadata } from "next";
import { AuthHeading } from "@/features/auth/components/auth-heading";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <>
      <AuthHeading title="Recuperar acceso" description="Te mandamos un link para crear una contraseña nueva." />
      <ForgotPasswordForm />
    </>
  );
}
