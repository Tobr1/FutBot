import type { ReactNode } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { ResumeRefresh } from "@/components/layout/resume-refresh";

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div data-shell="main" className="min-h-dvh">
      <AppHeader showLogo="always" />
      <main
        id="main"
        tabIndex={-1}
        className="mx-auto w-full max-w-5xl px-4 pt-4 pb-[calc(var(--float-bottom)+4.5rem)] outline-none lg:pt-6 lg:pb-16"
      >
        {children}
      </main>
      <ResumeRefresh />
    </div>
  );
}
