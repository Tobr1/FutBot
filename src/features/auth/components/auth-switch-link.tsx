"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";

const LINK_CLASS = "font-medium text-primary hover:underline";

/**
 * Link para pasar entre ingresar y registrarse conservando `?next=`.
 * Envolver en <Suspense fallback={<AuthSwitchLinkFallback … />}>.
 */
export function AuthSwitchLink({ href, label }: { href: string; label: string }) {
  const next = useSearchParams().get("next");
  return (
    <Link href={next ? `${href}?next=${encodeURIComponent(next)}` : href} className={LINK_CLASS}>
      {label}
    </Link>
  );
}

/** El mismo link sin `next`, para el HTML prerenderizado. */
export function AuthSwitchLinkFallback({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={LINK_CLASS}>
      {label}
    </Link>
  );
}
