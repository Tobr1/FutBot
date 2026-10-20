import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InstallAppCard } from "@/components/pwa/install-app-card";
import { AwardsSection } from "./sections/awards";
import { ChromeSection } from "./sections/chrome";
import { InstallGuidesDemo } from "./sections/install";
import { MatchesSection } from "./sections/matches";
import { PrimitivesSection } from "./sections/primitives";
import { SharedSection } from "./sections/shared";
import { StatsSection } from "./sections/stats";
import { TokensSection } from "./sections/tokens";

export const metadata: Metadata = {
  title: "UI kit",
  robots: { index: false, follow: false },
};

const SECTIONS = [
  { id: "tokens", label: "Tokens" },
  { id: "primitivas", label: "Primitivas" },
  { id: "compartidos", label: "Compartidos" },
  { id: "partidos", label: "Partidos" },
  { id: "estadisticas", label: "Estadísticas" },
  { id: "premios", label: "Premios y análisis" },
  { id: "chrome", label: "Chrome" },
  { id: "pwa", label: "PWA" },
] as const;

/** Galería de desarrollo para QA visual (375px). En producción es un 404. */
export default function UiKitPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main
      id="main"
      tabIndex={-1}
      className="mx-auto max-w-5xl px-4 pt-[max(1.5rem,var(--safe-top))] pb-[calc(var(--safe-bottom)+4rem)] outline-none"
    >
      <header className="space-y-3">
        <p className="text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">Solo desarrollo</p>
        <h1
          id="page-title"
          className="font-display text-display-lg font-extrabold tracking-wide uppercase sm:text-4xl"
        >
          UI kit
        </h1>
        <p className="text-sm text-muted-foreground">
          Tokens, primitivas, componentes y chrome de FulBot. Revisalo a 375px y con movimiento reducido.
        </p>
        <nav aria-label="Secciones del UI kit" className="no-scrollbar scroll-fade-x -mx-4 flex gap-2 overflow-x-auto px-4 pt-1">
          {SECTIONS.map((section) => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="pressable inline-flex h-10 shrink-0 items-center rounded-full border border-hairline bg-surface-1 px-4 text-sm font-medium"
            >
              {section.label}
            </a>
          ))}
        </nav>
      </header>

      <div className="mt-10 space-y-16">
        <div id="tokens" className="scroll-mt-6">
          <TokensSection />
        </div>
        <div id="primitivas" className="scroll-mt-6">
          <PrimitivesSection />
        </div>
        <div id="compartidos" className="scroll-mt-6">
          <SharedSection />
        </div>
        <div id="partidos" className="scroll-mt-6">
          <MatchesSection />
        </div>
        <div id="estadisticas" className="scroll-mt-6">
          <StatsSection />
        </div>
        <div id="premios" className="scroll-mt-6">
          <AwardsSection />
        </div>
        <div id="chrome" className="scroll-mt-6">
          <ChromeSection />
        </div>
        <section id="pwa" aria-labelledby="ui-kit-pwa" className="scroll-mt-6 space-y-3">
          <h2 id="ui-kit-pwa" className="font-display text-display-md font-extrabold tracking-wide uppercase">
            PWA
          </h2>
          <p className="text-sm text-muted-foreground">
            InstallAppCard aparece solo con puntero táctil, fuera de la app instalada y si no se cerró antes
            (localStorage fb:install-dismissed). El aviso sin conexión se prueba con DevTools › Network › Offline.
          </p>
          <InstallAppCard />
          <InstallGuidesDemo />
        </section>
      </div>
    </main>
  );
}
