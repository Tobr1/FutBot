import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl px-4 pt-6 pb-16">{children}</main>
    </div>
  );
}
