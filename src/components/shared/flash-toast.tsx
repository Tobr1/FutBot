"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * Muestra un toast según parámetros de la URL dejados por una redirección
 * (p. ej. `?ficha=vinculada`) y limpia la URL. Usar dentro de <Suspense>.
 */
export function FlashToast({ messages }: { messages: Record<string, Record<string, string>> }) {
  const searchParams = useSearchParams();
  const router = useRouter();
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
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [messages, pathname, router, searchParams]);

  return null;
}
