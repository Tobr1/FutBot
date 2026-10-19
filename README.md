# FUTBOLEROS

Plataforma privada para grupos de amigos que juegan al fútbol: registra partidos, goles, asistencias y calificaciones, y usa esos datos para armar equipos cada vez más parejos.

- **Análisis técnico y funcional:** [`docs/ANALISIS.md`](docs/ANALISIS.md)
- **Registro de decisiones:** [`docs/DECISIONES.md`](docs/DECISIONES.md)

## Estado

| Fase | Contenido | Estado |
|---|---|---|
| 1 — Fundación | Diseño base, esquema completo con RLS, autenticación, perfil, grupos, invitaciones, plantel, temporadas | ✅ Implementada |
| 2 — Partidos | Crear partidos, importar listas de WhatsApp, equipos manuales, resultados, registro de cambios | ✅ Implementada (ver D-022 a D-024) |
| 3 — Estadísticas | Votación anónima, motor de valoración, fichas con evolución, rankings, historial, comparador | ✅ Implementada (ver D-025 a D-030) |
| 4 — Equipos inteligentes | Optimizador de equipos con restricciones, alternativas explicadas, pronóstico | ✅ Implementada (ver D-031 a D-034) |
| 5 — Mejoras | Premios y logros, Salón de la fama, duplas y rivales, precisión del pronóstico, imágenes para compartir, análisis del grupo | ✅ Implementada (ver D-035 a D-041). Pendientes: pronósticos de los miembros y notificaciones (necesitan almacenamiento propio) |
| UI mobile-first | Rediseño pensado para el celular: barra inferior, hojas inferiores, tarjetas de jugador, transiciones y PWA instalable que abre en el último grupo | ✅ Implementado (ver D-016 a D-021) |

## Stack

Next.js 16 (App Router, Cache Components) · React 19 · TypeScript estricto · Tailwind CSS 4 · shadcn/ui (Radix) · Supabase (Postgres, Auth, Storage, RLS) · Vitest + PGlite.

## Puesta en marcha

### 1. Dependencias

Requiere Node.js 20.9 o superior.

```bash
npm install
```

### 2. Proyecto de Supabase

1. Creá un proyecto gratuito en [supabase.com](https://supabase.com).
2. Copiá `.env.example` a `.env.local` y completá `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (Project Settings → API). **No uses la `service_role` key**: la app no la necesita.
3. Aplicá las migraciones (cualquiera de las dos opciones):
   - Con el CLI: `npx supabase login`, `npx supabase link --project-ref <ref>` y `npx supabase db push`.
   - A mano: pegá en el SQL Editor, en orden, los archivos de `supabase/migrations/`.
4. En **Authentication → URL Configuration**: Site URL `http://localhost:3000` (y tu dominio en producción) y agregá `http://localhost:3000/**` a Redirect URLs.
5. En **Authentication → Emails → Templates**: reemplazá *Confirm signup* y *Reset password* por `supabase/templates/confirmation.html` y `supabase/templates/recovery.html`. Usan el flujo `token_hash`, que funciona aunque el email se abra en otro dispositivo.
6. En **Authentication → Providers → Email**: contraseña mínima de 8 caracteres con letras y números (coincide con la validación de la app).

### 3. Correr

```bash
npm run dev
```

Abrí <http://localhost:3000>.

### Probar en el celular

Con la PC y el teléfono en la misma red Wi-Fi, corré el servidor en el puerto 3001 (el 3000 puede estar ocupado) y abrí `http://<IP-de-la-PC>:3001` en el navegador del celular:

```bash
npm run dev -- -p 3001
```

`allowedDevOrigins` en `next.config.ts` ya acepta `192.168.*.*` y `10.*.*.*`. Para que los links de los emails (confirmación y recuperación) vuelvan al teléfono, agregá también `http://<IP-de-la-PC>:3001/**` a las Redirect URLs de Supabase.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm test` | Tests de dominio y de base de datos (RLS, RPC, triggers) sobre PGlite, sin Docker |
| `npm run typecheck` | TypeScript estricto |
| `npm run lint` | ESLint |
| `npm run db:types` | Regenera `src/types/database.ts` a partir de las migraciones |

## Estructura

```
docs/                 Análisis y decisiones
supabase/migrations/  Esquema versionado (tablas, RLS, RPC, triggers)
supabase/tests/       Tests de seguridad y reglas de negocio en Postgres (PGlite)
scripts/              Generador de tipos de la base
src/app/              Rutas (solo composición de UI)
src/features/         Módulos: auth, profile, groups, invitations, players, matches, voting, teams, stats, awards, share (queries · actions · schemas · components)
src/domain/           Lógica pura y testeable (nombres, posiciones, valoración…)
src/lib/              Supabase, sesión, errores, utilidades
src/components/       UI base (shadcn), layout y componentes compartidos
```

## Seguridad

- RLS en todas las tablas; la app siempre consulta como el usuario logueado.
- Operaciones de varios pasos en funciones transaccionales con verificaciones explícitas.
- Votos individuales visibles solo para quien votó; los agregados se publican al cerrar la votación.
- Auditoría de cambios relevantes (miembros, jugadores, invitaciones, partidos, resultados, reglas de armado), visible para admins en Más › Registro de cambios.
- Imágenes para compartir solo con sesión y membresía, nunca cacheadas públicamente.

## Deploy

Vercel (plan gratuito): importá el repositorio y definí las mismas variables de `.env.local`, con `NEXT_PUBLIC_SITE_URL` apuntando a tu dominio. Agregá ese dominio en las URLs de Supabase Auth.
