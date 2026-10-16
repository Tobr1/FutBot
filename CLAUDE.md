@AGENTS.md

# FUTBOLEROS — notas para agentes

- Producto, arquitectura y roadmap: `docs/ANALISIS.md`. Decisiones: `docs/DECISIONES.md` (registrar las nuevas ahí).
- UI y textos en español rioplatense (voseo). Código e identificadores de base en inglés.
- Next.js 16 con `cacheComponents`: toda lectura de sesión/params va dentro de `<Suspense>` o en páginas con `loading.tsx`; los layouts no hacen `await` de params ni de la sesión en su nivel superior. El middleware se llama `src/proxy.ts`.
- Capas: `app` (rutas) → `features/*` (`queries.ts` server-only, `actions.ts` Server Actions, `schemas.ts` zod, `components/`) → `domain` (puro, sin IO) y `lib`.
- Seguridad: RLS en todas las tablas, nunca usar la service role key en la app. Escrituras de varios pasos = RPC transaccional. Errores de RPC = claves estables traducidas en `src/lib/errors.ts`.
- Esquema: nueva migración en `supabase/migrations/` + tests en `supabase/tests/` + `npm run db:types`.
- Antes de terminar: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.
