import { ArrowRight, BarChart3, ClipboardPaste, Scale, ShieldCheck, Trophy, Vote } from "lucide-react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PlayerCard, type PlayerCardData } from "@/components/shared/player-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

const FEATURES = [
  {
    icon: Scale,
    title: "Equipos parejos",
    text: "Un algoritmo que usa nivel, forma reciente y posiciones para armar partidos equilibrados. Y te explica por qué.",
    soon: true,
  },
  {
    icon: ClipboardPaste,
    title: "Pegá la lista de WhatsApp",
    text: "Copiás la lista del grupo y FUTBOLEROS reconoce a cada jugador. Sin duplicados.",
    soon: true,
  },
  {
    icon: Vote,
    title: "Votación anónima",
    text: "Después de cada partido, compañeros y rivales califican del 1 al 10. Nadie ve quién votó qué.",
    soon: true,
  },
  {
    icon: BarChart3,
    title: "Estadísticas de verdad",
    text: "Goles, asistencias, victorias, MVP y la evolución de cada jugador fecha a fecha.",
    soon: false,
  },
  {
    icon: Trophy,
    title: "Rankings y premios",
    text: "Goleador, asistidor, el más regular, el mejor momento. Con mínimos para que sean justos.",
    soon: true,
  },
  {
    icon: ShieldCheck,
    title: "Privado y seguro",
    text: "Cada grupo es privado. Solo entran tus invitados y cada cambio relevante queda registrado.",
    soon: false,
  },
];

const DEMO_TEAM: PlayerCardData[] = [
  { nickname: "Brito", rating: 7.8, primaryPosition: "midfielder", stats: { matches: 24, goals: 9, assists: 14 } },
  { nickname: "Vece", rating: 8.6, primaryPosition: "forward", stats: { matches: 21, goals: 27, assists: 6 } },
  { nickname: "Paramo", rating: 6.9, primaryPosition: "goalkeeper", stats: { matches: 26, goals: 0, assists: 2 } },
];

/** Abanico de cartas: el desplazamiento es relativo al ancho de cada carta, así escala del teléfono al escritorio. */
function fanStyle(i: number): CSSProperties {
  const offset = i - 1;
  return {
    transform: `translateX(calc(${offset} * 62%)) translateY(${offset === 0 ? -4 : 3}%) rotate(${offset * 7}deg) scale(${offset === 0 ? 1 : 0.9})`,
    zIndex: offset === 0 ? 2 : 1,
    "--i": i,
  } as CSSProperties;
}

export default function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-hidden pb-[calc(max(1rem,var(--safe-bottom))+4.5rem)] sm:pb-0">
      <header className="pt-[var(--safe-top)]">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="flex items-center gap-2" aria-label="Cuenta">
            <Button variant="ghost" asChild>
              <Link href={routes.login}>Ingresar</Link>
            </Button>
            <Button asChild className="hidden sm:inline-flex">
              <Link href={routes.signup}>Crear cuenta</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="outline-none">
        <section className="mx-auto grid max-w-6xl items-center gap-6 px-4 pt-2 pb-14 sm:gap-12 sm:pt-10 sm:pb-20 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div className="space-y-5 sm:space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
              Fútbol amateur con datos
            </p>
            <h1 className="font-display text-display-xl font-extrabold tracking-wide uppercase sm:text-7xl sm:leading-[0.92]">
              Partidos entre amigos.
              <br />
              <span className="bg-gradient-to-r from-primary to-[oklch(0.75_0.15_220)] bg-clip-text text-transparent">
                Equipos más parejos.
              </span>
            </h1>
            <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
              Registrá resultados, goles y asistencias, votá el rendimiento de cada uno y dejá que FUTBOLEROS arme equipos
              equilibrados con lo que aprende de cada fecha.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              {/* En el teléfono esta acción vive en la barra fija de abajo; acá no se repite. */}
              <Button size="lg" className="hidden w-full sm:inline-flex sm:w-auto" asChild>
                <Link href={routes.signup}>
                  Crear mi grupo gratis
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" className="w-full sm:w-auto" asChild>
                <Link href={routes.login}>Ya tengo cuenta</Link>
              </Button>
            </div>
          </div>

          <div
            className="relative order-first mx-auto flex h-[250px] w-full max-w-md items-center justify-center sm:h-[320px] lg:order-none lg:h-[380px]"
            aria-hidden="true"
          >
            <div className="absolute inset-x-6 inset-y-8 rounded-[2rem] bg-primary/10 blur-3xl" />
            {DEMO_TEAM.map((player, i) => (
              <div key={player.nickname} className="absolute w-[34vw] max-w-44 lg:max-w-48" style={fanStyle(i)}>
                <div className="animate-rise [animation-delay:calc(min(var(--i),8)*35ms)]">
                  <PlayerCard player={player} headingLevel="p" priority={i === 1} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-hairline bg-surface-1/40" aria-labelledby="features-title">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:py-20">
            <h2
              id="features-title"
              className="font-display text-display-lg font-extrabold tracking-wide uppercase sm:text-4xl"
            >
              Todo lo que tu grupo necesita
            </h2>
            <ul className="mt-6 grid grid-cols-2 gap-2 sm:mt-10 sm:gap-4 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text, soon }) => (
                <li key={title} className="panel rounded-xl p-3 sm:rounded-2xl sm:p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid size-8 place-items-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/25 sm:size-10 sm:rounded-xl">
                      <Icon className="size-4 sm:size-5" aria-hidden="true" />
                    </span>
                    {soon && (
                      <Badge tone="primary" size="sm">
                        Pronto
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-3 font-display text-base leading-tight font-bold tracking-wide uppercase sm:mt-4 sm:text-xl">
                    {title}
                  </h3>
                  <p className="mt-1 line-clamp-3 text-xs text-muted-foreground sm:mt-1.5 sm:line-clamp-none sm:text-sm">
                    {text}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row sm:pb-[max(2rem,var(--safe-bottom))]">
        <Logo compact />
        <p>FUTBOLEROS · Hecho para el fútbol de los amigos.</p>
      </footer>

      {/* En el teléfono, la acción principal queda siempre a mano del pulgar. */}
      <div className="fixed inset-x-4 bottom-[max(1rem,var(--safe-bottom))] z-30 sm:hidden">
        <Button size="lg" className="w-full" asChild>
          <Link href={routes.signup}>
            Crear mi grupo gratis
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
