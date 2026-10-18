import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const SHIELD = "block size-10 rounded-[28%_28%_46%_46%] bg-surface-3 ring-1 ring-hairline ring-inset";

/**
 * Lugar del próximo partido en el inicio del grupo. Mientras los partidos no
 * existan, es un fixture "fantasma" compacto (menos de 96 px en mobile).
 */
export function NextMatchCard({ className }: { className?: string }) {
  return (
    <section aria-labelledby="next-match-title" className={cn("panel flex items-center gap-4 rounded-xl px-4 py-3.5", className)}>
      <div aria-hidden="true" className="flex shrink-0 items-center gap-2 opacity-70">
        <span className={SHIELD} />
        <span className="font-display text-sm font-bold tracking-wider text-muted-foreground">VS</span>
        <span className={SHIELD} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <h2
            id="next-match-title"
            className="truncate text-2xs font-semibold tracking-[0.12em] text-muted-foreground uppercase"
          >
            Próximo partido
          </h2>
          <Badge tone="primary" size="sm">
            Muy pronto
          </Badge>
        </div>
        <p className="mt-0.5 text-[13px] leading-[18px] text-muted-foreground">
          Muy pronto vas a armar los partidos desde acá.
        </p>
      </div>
    </section>
  );
}
