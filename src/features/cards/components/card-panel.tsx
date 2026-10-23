import { Crown, PenLine, ShieldCheck, Sparkles, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ELITE_MVPS, MIN_VALIDATORS, type CardModel } from "@/domain/cards/cards";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Cómo se arma la carta de un jugador: de dónde sale la media, cuántos
 * compañeros la validaron (nunca qué puso cada uno), la forma reciente por
 * partidos y el camino a la edición Élite. Con la acción que corresponde:
 * autoevaluarse (ficha propia) o validar (compañero con ficha).
 */
export function CardPanel({
  card,
  validators,
  hasSelf,
  updatedAt,
  formOverall,
  mvps,
  action,
  className,
}: {
  card: CardModel;
  validators: number;
  hasSelf: boolean;
  updatedAt: string | null;
  /** Media por partidos (10-99), la "forma". */
  formOverall: number;
  mvps: number;
  action: { href: string; label: string; kind: "self" | "peer" } | null;
  className?: string;
}) {
  const fromAttributes = card.source === "attributes";
  const missing = Math.max(0, MIN_VALIDATORS - validators);
  return (
    <section aria-labelledby="como-se-calcula" className={cn("panel space-y-4 rounded-xl p-4", className)}>
      <h2 id="como-se-calcula" className="text-base font-semibold tracking-tight">
        Cómo se arma la carta
      </h2>
      <ul className="space-y-3 text-sm">
        <li className="flex items-start gap-3">
          <Users className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          <p className="min-w-0">
            {fromAttributes ? (
              <>
                <span className="font-semibold">Atributos:</span> 20 % autoevaluación
                {hasSelf ? "" : " (todavía no la hizo)"} y 80 % lo que validan sus compañeros.{" "}
                <span className="text-muted-foreground">
                  {validators === 1 ? "1 validación" : `${validators} validaciones`}
                  {updatedAt ? ` · actualizada ${formatDate(updatedAt)}` : ""}
                </span>
              </>
            ) : (
              <>
                <span className="font-semibold">Sin atributos todavía:</span> la media sale por ahora de las notas de los
                partidos.
              </>
            )}
          </p>
        </li>
        <li className="flex items-start gap-3">
          {card.provisional ? (
            <Sparkles className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
          ) : (
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
          )}
          <p className="min-w-0">
            {card.provisional
              ? fromAttributes
                ? `Provisional: ${missing === 1 ? "falta 1 validación" : `faltan ${missing} validaciones`} para que sea definitiva.`
                : "Provisional hasta que se autoevalúe y lo validen 3 compañeros."
              : "Validada por el plantel."}
          </p>
        </li>
        <li className="flex items-start gap-3">
          <TrendingUp className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="min-w-0">
            <span className="font-semibold">Forma por partidos:</span> {formOverall}.{" "}
            <span className="text-muted-foreground">Es aparte: sale de las notas de cada partido y no cambia los atributos.</span>
          </p>
        </li>
        <li className="flex items-start gap-3">
          <Crown className={cn("mt-0.5 size-4 shrink-0", card.elite ? "text-primary" : "text-muted-foreground")} aria-hidden="true" />
          <p className="min-w-0">
            {card.elite
              ? `Edición Élite: ${mvps} veces jugador del partido.`
              : `Edición Élite con ${ELITE_MVPS} MVP (lleva ${mvps}). Cambia el diseño, no la media.`}
          </p>
        </li>
      </ul>
      {action && (
        <Button asChild size="lg" variant={action.kind === "self" ? "default" : "secondary"} className="w-full lg:w-auto">
          <Link href={action.href} transitionTypes={["nav-forward"]}>
            <PenLine aria-hidden="true" />
            {action.label}
          </Link>
        </Button>
      )}
    </section>
  );
}
