"use client";

import { Check, CircleHelp, Clock, IdCard, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { MyAttendance } from "@/domain/matches/attendance";
import { cn } from "@/lib/utils";
import { setMyAttendanceAction } from "../actions";

const COPY: Record<MyAttendance["kind"], { title: string; icon: typeof Check; tone: string }> = {
  confirmed: { title: "Vas: estás confirmado", icon: Check, tone: "bg-win/14 text-win ring-win/30" },
  reserve: { title: "Estás de suplente", icon: Clock, tone: "bg-warning/14 text-warning ring-warning/30" },
  dropped: { title: "Avisaste que no vas", icon: X, tone: "bg-white/6 text-muted-foreground ring-hairline" },
  none: { title: "¿Vas al partido?", icon: CircleHelp, tone: "bg-primary/12 text-primary ring-primary/25" },
};

/**
 * "Voy / No voy" del jugador. Si el partido está completo, "Voy" lo deja de
 * suplente (lo decide la base, por orden de llegada). Muestra el cambio al
 * instante y lo confirma cuando responde el servidor.
 */
export function AttendanceCard({
  matchId,
  attendance,
  free,
  claimHref,
}: {
  matchId: string;
  attendance: MyAttendance;
  /** Lugares de titular libres. */
  free: number;
  /** Sin ficha vinculada: link para vincularla (no puede confirmar). */
  claimHref?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(attendance);

  if (claimHref) {
    return (
      <div className="panel flex items-center gap-3 rounded-xl p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
          <IdCard className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold">¿Vas al partido?</p>
          <p className="text-sm text-muted-foreground">Vinculá tu ficha para confirmar.</p>
        </div>
        <Button asChild size="sm" variant="secondary">
          <Link href={claimHref} transitionTypes={["nav-forward"]}>
            Vincular
          </Link>
        </Button>
      </div>
    );
  }

  function answer(going: boolean) {
    if (isPending) return;
    startTransition(async () => {
      setOptimistic(going ? (free > 0 ? { kind: "confirmed" } : { kind: "reserve", position: 0 }) : { kind: "dropped" });
      const result = await setMyAttendanceAction({ matchId, going });
      if (result.ok) toast.success(result.message);
      else toast.error(result.message);
    });
  }

  const copy = COPY[optimistic.kind];
  const going = optimistic.kind === "confirmed" || optimistic.kind === "reserve";
  const detail =
    optimistic.kind === "reserve"
      ? optimistic.position > 0
        ? `N.º ${optimistic.position} en la fila: si alguien se baja, entrás.`
        : "Si alguien se baja, entrás."
      : optimistic.kind === "confirmed"
        ? "Si al final no podés, avisá acá así entra otro."
        : free > 0
          ? free === 1
            ? "Queda 1 lugar."
            : `Quedan ${free} lugares.`
          : "Está completo: si confirmás, quedás de suplente.";

  return (
    <section aria-labelledby="asistencia" className="panel space-y-4 rounded-xl p-4" aria-busy={isPending || undefined}>
      <div className="flex items-start gap-3">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl ring-1", copy.tone)}>
          <copy.icon className="size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1" aria-live="polite">
          <h2 id="asistencia" className="text-[15px] font-semibold">
            {copy.title}
          </h2>
          <p className="text-sm text-muted-foreground">{detail}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="lg"
          variant={going ? "default" : "outline"}
          aria-pressed={going}
          disabled={isPending}
          onClick={() => answer(true)}
        >
          {isPending && !going ? <Loader2 className="motion-safe:animate-spin" aria-hidden="true" /> : <Check aria-hidden="true" />}
          Voy
        </Button>
        <Button
          type="button"
          size="lg"
          variant={optimistic.kind === "dropped" ? "secondary" : "outline"}
          aria-pressed={optimistic.kind === "dropped"}
          disabled={isPending}
          onClick={() => answer(false)}
        >
          <X aria-hidden="true" />
          No voy
        </Button>
      </div>
    </section>
  );
}
