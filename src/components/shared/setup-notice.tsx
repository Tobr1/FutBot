import { Wrench } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/env";

/** Aviso para desarrollo cuando faltan las variables de Supabase. */
export function SetupNotice() {
  if (isSupabaseConfigured) return null;
  return (
    <div role="alert" className="flex gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm text-warning">
      <Wrench className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="space-y-1">
        <p className="font-semibold">Falta configurar Supabase</p>
        <p className="text-warning/85">
          Copiá <code className="font-mono">.env.example</code> a <code className="font-mono">.env.local</code>, completá la URL y la
          clave publicable del proyecto y reiniciá el servidor. Ver <code className="font-mono">README.md</code>.
        </p>
      </div>
    </div>
  );
}
