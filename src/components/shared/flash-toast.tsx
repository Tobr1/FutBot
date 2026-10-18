"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Muestra un toast según parámetros de la URL dejados por una redirección
 * (p. ej. `?ficha=vinculada`) y limpia la URL. Usar dentro de <Suspense>
 * (lee useSearchParams).
 *
 * La limpieza usa window.history.replaceState: Next integra la History API
 * nativa (usePathname/useSearchParams se sincronizan) sin pedir otro render
 * del servidor, a diferencia de router.replace.
 */
export function FlashToast({ messages }: { messages: Record<string, Record<string, string>> }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const shown = useRef(false);

  useEffect(() => {
    if (shown.current) return;
    const next = new URLSearchParams(searchParams.toString());
    let found = false;
    for (const [param, values] of Object.entries(messages)) {
      const value = searchParams.get(param);
      if (value && values[value]) {
        toast.success(values[value]);
        next.delete(param);
        found = true;
      }
    }
    if (found) {
      shown.current = true;
      const query = next.toString();
      window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    }
  }, [messages, pathname, searchParams]);

  return null;
}
