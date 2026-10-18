import { BarChart3, Scale, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PlayerCard, type PlayerCardData } from "@/components/shared/player-card";
import { SetupNotice } from "@/components/shared/setup-notice";
import { routes } from "@/lib/routes";

const HIGHLIGHTS = [
  { icon: Scale, text: "Equipos parejos armados con datos, no a dedo." },
  { icon: BarChart3, text: "Goles, asistencias y calificaciones de cada fecha." },
  { icon: Trophy, text: "Rankings y premios para picar la competencia." },
];

const DEMO_PLAYER: PlayerCardData = {
  nickname: "El 10",
  fullName: "Tu ficha, partido a partido",
  rating: 8.4,
  primaryPosition: "forward",
  stats: { matches: 32, goals: 41, assists: 17 },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="pitch-lines relative hidden overflow-hidden border-r border-hairline bg-surface-1/40 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href={routes.home} aria-label="FUTBOLEROS, inicio" className="self-start">
          <Logo />
        </Link>
        <div className="relative flex items-center gap-8 xl:gap-10">
          <div className="w-40 shrink-0 rotate-[-4deg] xl:w-52" aria-hidden="true">
            <PlayerCard player={DEMO_PLAYER} headingLevel="p" />
          </div>
          <div className="min-w-0 space-y-6">
            <p className="font-display text-4xl leading-[0.95] font-extrabold tracking-wide uppercase xl:text-5xl">
              El partido de los sábados,
              <br />
              <span className="text-primary">con estadísticas.</span>
            </p>
            <ul className="space-y-3">
              {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/25">
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Hecho para grupos de amigos. Gratis.</p>
      </aside>

      <main
        id="main"
        tabIndex={-1}
        className="flex flex-col px-4 pt-[max(2rem,var(--safe-top))] pb-[max(2rem,var(--safe-bottom))] outline-none sm:px-8"
      >
        <Link href={routes.home} className="mb-4 self-start lg:hidden" aria-label="FUTBOLEROS, inicio">
          <Logo />
        </Link>

        {/* Franja de marca en el teléfono: el aside de escritorio, en chiquito. */}
        <div
          aria-hidden="true"
          className="pitch-lines relative -mx-4 mb-6 h-36 overflow-hidden border-y border-hairline sm:-mx-8 lg:hidden"
        >
          <span className="absolute inset-0 bg-[radial-gradient(90%_120%_at_85%_40%,oklch(0.66_0.19_256/22%),transparent_65%)]" />
          <p className="relative flex h-full max-w-[60%] items-center px-4 font-display text-xl leading-[0.95] font-extrabold tracking-wide uppercase sm:px-8">
            <span>
              El partido de los sábados, <span className="text-primary">con estadísticas.</span>
            </span>
          </p>
          <div className="absolute top-5 -right-3 w-24 rotate-[-6deg] sm:right-6">
            <PlayerCard player={DEMO_PLAYER} headingLevel="p" showFullName={false} />
          </div>
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6">
          <SetupNotice />
          {children}
        </div>
      </main>
    </div>
  );
}
