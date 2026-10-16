import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFormSkeleton, AuthHeading } from "@/features/auth/components/auth-heading";
import { SignUpForm } from "@/features/auth/components/sign-up-form";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignUpPage() {
  return (
    <>
      <AuthHeading title="Crear cuenta" description="Armá tu grupo o sumate al de tus amigos." />
      <Suspense fallback={<AuthFormSkeleton fields={3} />}>
        <SignUpForm />
      </Suspense>
    </>
  );
}
