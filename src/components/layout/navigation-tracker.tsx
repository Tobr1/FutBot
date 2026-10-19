"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { markSoftNavigation } from "@/lib/navigation/in-app-history";

/** Cuenta los cambios de ruta del cliente (respaldo de canGoBackInApp). Va en <Suspense>. */
export function NavigationTracker() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    markSoftNavigation();
  }, [pathname]);
  return null;
}
