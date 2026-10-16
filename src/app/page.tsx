import { ArrowRight, BarChart3, ClipboardPaste, Scale, ShieldCheck, Trophy, Vote } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { PlayerCard } from "@/components/shared/player-card";
import { Button } from "@/components/ui/button";
import { routes } from "@/lib/routes";

const FEATURES = [
  {
    icon: Scale,
    title: "Equipos parejos",
    text: "Un algoritmo que usa nivel, forma reciente y posiciones para armar partidos equilibrados. Y te explica por qué.",
  },
  {
    icon: ClipboardPaste,
    title: "Pegá la lista de WhatsApp",
    text: "Copiás la lista del grupo y FUTBOLEROS reconoce a cada jugador. Sin duplicados.",
  },
  {
    icon: Vote,
    title: "Votación anónima",
    text: "Después de cada partido, compañeros y rivales califican del 1 al 10. Nadie ve quién votó qué.",
  },
  {
    icon: BarChart3,
    title: "Estadísticas de verdad",
    text: "Goles, asistencias, victorias, MVP y la evolución de cada jugador fecha a fecha.",
  },
  {
    icon: Trophy,
    title: "Rankings y premios",
    text: "Goleador, asistidor, el más regular, el mejor momento. Con mínimos para que sean justos.",
  },
  {
    icon: ShieldCheck,
    title: "Privado y seguro",
    text: "Cada grupo es privado. Solo entran tus invitados y cada cambio relevante queda registrado.",
  },
];

const DEMO_TEAM = [
  { nickname: "Brito", rating: 7.8, primaryPosition: "midfielder" as const, stats: { matches: 24, goals: 9, assists: 14 } },
  { nickname: "Vece", rating: 8.6, primaryPosition: "forward" as const, stats: { matches: 21, goals: 27, assists: 6 } },
  { nickname: "Paramo", rating: 6.9, primaryPosition: "goalkeeper" as const, stats: { matches: 26, goals: 0, assists: 2 } },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh overflow-x-hidden">
      <header className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href={routes.login}>Ingresar</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href={routes.signup}>Crear cuenta</Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-10 pb-20 lg:grid-cols-[1.1fr_1fr] lg:pt-20">
          <div className="space-y-7">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wider text-primary uppercase">
              Fútbol amateur con datos
            </p>
            <h1 className="font-display text-5xl leading-[0.92] font-extrabold tracking-wide uppercase sm:text-7xl">
              Partidos entre amigos.
              <br />
              <span className="bg-gradient-to-r from-primary to-[oklch(0.75_0.15_220)] bg-clip-text text-transparent">
                Equipos más parejos.
              </span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Registrá resultados, goles y asistencias, votá el rendimiento de cada uno y dejá que FUTBOLEROS arme equipos
              equilibrados con lo que aprende de cada fecha.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href={routes.signup}>
                  Crear mi grupo gratis
                  <ArrowRight aria-hidden="true" />
                </Link>
              </Button>
              <Button size="lg" variant="secondary" asChild>
                <Link href={routes.login}>Ya tengo cuenta</Link>
              </Button>
            </div>
          </div>

          <div className="relative mx-auto flex h-[380px] w-full max-w-md items-center justify-center" aria-hidden="true">
            <div className="absolute inset-x-6 inset-y-10 rounded-[2rem] bg-primary/10 blur-3xl" />
            {DEMO_TEAM.map((player, i) => (
              <div
                key={player.nickname}
                className="absolute w-44 sm:w-48"
                style={{
                  transform: `translateX(${(i - 1) * 115}px) rotate(${(i - 1) * 8}deg) translateY(${i === 1 ? -14 : 12}px)`,
                  zIndex: i === 1 ? 2 : 1,
                }}
              >
                <PlayerCard player={player} />
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-surface/40">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <h2 className="font-display text-4xl font-extrabold tracking-wide uppercase">Todo lo que tu grupo necesita</h2>
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="rounded-2xl border border-border bg-card/70 p-5">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 font-display text-xl font-bold tracking-wide uppercase">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-muted-foreground sm:flex-row">
        <Logo compact />
        <p>FUTBOLEROS · Hecho para el fútbol de los amigos.</p>
      </footer>
    </div>
  );
}
