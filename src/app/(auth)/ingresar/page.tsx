import type { Metadata } from "next";
import { AuthHeading } from "@/features/auth/components/auth-heading";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata: Metadata = { title: "Ingresar" };

export default function SignInPage() {
  return (
    <>
      <AuthHeading title="Ingresar" description="Entrá para ver tus grupos, partidos y estadísticas." />
      <SignInForm />
    </>
  );
}
