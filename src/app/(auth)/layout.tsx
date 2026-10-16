import { BarChart3, Scale, Trophy } from "lucide-react";
import type { ReactNode } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PlayerCard } from "@/components/shared/player-card";
import { SetupNotice } from "@/components/shared/setup-notice";
import { routes } from "@/lib/routes";

const HIGHLIGHTS = [
  { icon: Scale, text: "Equipos parejos armados con datos, no a dedo." },
  { icon: BarChart3, text: "Goles, asistencias y calificaciones de cada fecha." },
  { icon: Trophy, text: "Rankings y premios para picar la competencia." },
];

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      <aside className="pitch-lines relative hidden overflow-hidden border-r border-border bg-surface/40 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href={routes.home} aria-label="FUTBOLEROS, inicio">
          <Logo />
        </Link>
        <div className="relative flex items-center gap-8 xl:gap-10">
          <div className="w-40 shrink-0 rotate-[-4deg] xl:w-52">
            <PlayerCard
              player={{
                nickname: "El 10",
                fullName: "Tu ficha, partido a partido",
                rating: 8.4,
                primaryPosition: "forward",
                stats: { matches: 32, goals: 41, assists: 17 },
              }}
            />
          </div>
          <div className="min-w-0 space-y-6">
            <h2 className="font-display text-4xl leading-[0.95] font-extrabold tracking-wide uppercase xl:text-5xl">
              El partido de los sábados,
              <br />
              <span className="text-primary">con estadísticas.</span>
            </h2>
            <ul className="space-y-3">
              {HIGHLIGHTS.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-primary">
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

      <main className="flex flex-col px-4 py-8 sm:px-8">
        <Link href={routes.home} className="mb-10 self-start lg:hidden" aria-label="FUTBOLEROS, inicio">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6">
          <SetupNotice />
          {children}
        </div>
      </main>
    </div>
  );
}
