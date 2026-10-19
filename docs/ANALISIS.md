# FutBot — Análisis técnico y funcional

> Versión 1 · 16/10/2026 · Documento vivo: cada decisión que cambie se registra en [`DECISIONES.md`](./DECISIONES.md).

FutBot es una plataforma privada para grupos de amigos que juegan al fútbol. Convierte cada partido en datos (resultado, goles, asistencias, calificaciones) y usa esos datos para armar equipos cada vez más parejos.

El diferencial del producto no es la carga de datos sino lo que pasa después: **una valoración por jugador que aprende partido a partido y un algoritmo de armado que la aprovecha**. Todo el diseño apunta a que esa información sea confiable (permisos sólidos, transacciones, anonimato real) y a que cargarla sea rápido (mobile-first, importación desde WhatsApp).

---

## 1. Arquitectura recomendada

### 1.1 Vista general

```
┌───────────────────────────── Navegador (mobile-first) ─────────────────────────────┐
│  React 19 · Server Components + islas cliente (formularios, armado de equipos)     │
└──────────────────────────────────────┬─────────────────────────────────────────────┘
                                       │ HTTPS (RSC + Server Actions)
┌──────────────────────────────────────▼─────────────────────────────────────────────┐
│  Next.js 16 (App Router, Cache Components) — Vercel                                │
│                                                                                    │
│  proxy.ts ── refresca la sesión de Supabase y redirige rutas privadas              │
│  app/      ── rutas: solo composición de UI y Suspense                             │
│  features/ ── por módulo: queries (DAL server-only) · actions (Server Actions)     │
│               · schemas (zod) · components                                         │
│  domain/   ── lógica pura y testeable: valoración, balanceo, parser WhatsApp       │
└──────────────────────────────────────┬─────────────────────────────────────────────┘
                                       │ supabase-js con la sesión del usuario (nunca service key)
┌──────────────────────────────────────▼─────────────────────────────────────────────┐
│  Supabase                                                                          │
│  Auth (email + contraseña) · PostgreSQL 15+ · Storage (avatares)                   │
│  RLS en TODAS las tablas · RPC transaccionales (SECURITY DEFINER con chequeos)     │
│  Triggers de auditoría · vistas security_invoker para estadísticas                 │
└────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Principios

| Principio | Cómo se aplica |
|---|---|
| **La base de datos es la última línea de defensa** | Toda autorización se repite en Postgres con RLS. La UI y las Server Actions validan para dar buena experiencia, pero aunque alguien llame a la API de Supabase directamente con su token no puede leer ni escribir fuera de sus grupos. |
| **Sin service role key en la app** | La aplicación siempre habla con Supabase como el usuario logueado. Las operaciones que necesitan saltar RLS (aceptar invitación, votar, registrar resultado) son funciones `SECURITY DEFINER` con verificaciones explícitas adentro. Menos superficie de ataque y nada secreto que filtrar. |
| **Operaciones de varios pasos = una transacción** | Crear grupo, aceptar invitación, guardar equipos, registrar resultado y votar son RPC atómicas. Nunca quedan partidos "a medio cargar". |
| **Lógica de negocio fuera de la UI** | Valoración, balanceo de equipos y parser de listas viven en `src/domain`, son funciones puras con tests. La UI solo las invoca. |
| **Datos derivados: calculados, no duplicados** | Estadísticas (PJ, PG, goles, promedios) salen de vistas sobre los hechos (`team_members`, `match_events`, `match_ratings`). Si en el futuro se materializan, será como caché reconstruible con versión de algoritmo. |
| **Evolución del algoritmo sin tocar la arquitectura** | El motor de valoración es una función determinista `historial → valoraciones` con configuración y número de versión. Cambiar pesos o la fórmula = recalcular, no migrar datos. |

### 1.3 Stack y por qué

| Capa | Elección | Motivo |
|---|---|---|
| Framework | **Next.js 16.4** App Router, Cache Components, Turbopack | Server Components reducen JS en mobile; Server Actions evitan una API REST paralela; Suspense da carga progresiva natural. |
| Lenguaje | **TypeScript estricto** | Tipos generados desde el esquema de la base. |
| Estilos | **Tailwind CSS v4** + **shadcn/ui** (Radix) | Primitivas accesibles que se pueden reestilizar por completo con tokens propios (no parece "panel admin"). |
| Íconos / animación / gráficos | **lucide-react**, **motion**, **recharts** | Livianos y con buena integración con React 19. |
| Validación | **zod 4** | Esquemas compartidos entre formularios y Server Actions. |
| Backend | **Supabase** (Postgres, Auth, Storage) | Plan gratuito suficiente para el MVP; RLS nativo; sin servidor propio. |
| Tests | **Vitest** + **PGlite** | PGlite es Postgres real en WASM: aplica las migraciones y prueba RLS, triggers y RPC sin Docker. |
| Hosting | **Vercel Hobby** + **Supabase Free** | Costo cero en el MVP. |

### 1.4 Patrón de datos con Cache Components

Next.js 16 con `cacheComponents` obliga a que toda lectura de cookies (sesión) ocurra dentro de un `<Suspense>`. Lo adoptamos como ventaja:

- **Layouts sin datos de sesión en su nivel superior**: el shell (navegación, marca) se prerenderiza y aparece al instante; el contenido por usuario entra en streaming con skeletons.
- **DAL (`features/*/queries.ts`)** con `import 'server-only'`: cada función obtiene el usuario de la sesión y consulta con su cliente de Supabase. Deduplicación por request con `React.cache`.
- **Mutaciones** en Server Actions: validan con zod, llaman a la RPC o tabla, y refrescan con `revalidatePath`/`refresh()`.
- **`proxy.ts`** (antes middleware) refresca el token de Supabase en cada request y redirige rápido a `/ingresar` si no hay sesión. Es un chequeo optimista: la autorización real está en el DAL y en RLS.

---

## 2. Estructura de carpetas

```
futbot/
├── docs/                         Análisis, decisiones, guías de setup
├── supabase/
│   ├── config.toml               Config del CLI de Supabase
│   ├── migrations/               SQL versionado: <timestamp>_<nombre>.sql
│   ├── seed.sql                  Datos de demo para desarrollo local
│   └── tests/                    Tests de RLS/RPC con PGlite (vitest)
├── scripts/
│   └── gen-db-types.ts           Aplica migraciones en PGlite y genera src/types/database.ts
├── src/
│   ├── proxy.ts                  Refresco de sesión + redirección optimista
│   ├── app/                      Rutas (solo composición)
│   │   ├── (public)/             Landing
│   │   ├── (auth)/               ingresar · registro · recuperar · nueva-clave
│   │   ├── auth/confirm/         Route handler de verificación de email
│   │   ├── invitacion/[token]/   Vista previa y aceptación de invitaciones
│   │   └── (app)/                Área autenticada con shell
│   │       ├── inicio/           Mis grupos, próximos partidos, votos pendientes
│   │       ├── perfil/           Cuenta del usuario
│   │       ├── grupos/nuevo/
│   │       └── g/[slug]/         Todo lo de un grupo (ver mapa de navegación)
│   ├── components/
│   │   ├── ui/                   Primitivas shadcn (re-tematizadas)
│   │   ├── brand/                Logo, marca
│   │   ├── layout/               Shell, navegación inferior/lateral, encabezados
│   │   └── shared/               Estados vacíos, tarjetas de estadística, avatar de jugador…
│   ├── features/                 Módulos verticales
│   │   ├── auth/                 actions.ts · schemas.ts · components/
│   │   ├── profile/
│   │   ├── groups/
│   │   ├── invitations/
│   │   ├── players/
│   │   ├── matches/              (Fase 2)
│   │   ├── voting/               (Fase 3)
│   │   ├── stats/                (Fase 3)
│   │   └── teams/                (Fase 4)
│   ├── domain/                   Lógica pura, sin IO ni React
│   │   ├── names/                Normalización de nombres, slugs
│   │   ├── lineup-import/        Parser de listas de WhatsApp + matching (Fase 2)
│   │   ├── rating/               Motor de valoración (Fase 3–4)
│   │   └── balancer/             Optimizador de equipos (Fase 4)
│   ├── lib/
│   │   ├── supabase/             Clientes server/browser y helper del proxy
│   │   ├── auth/                 DAL de sesión: getCurrentUser, requireUser
│   │   ├── env.ts                Validación de variables de entorno
│   │   ├── errors.ts             Traducción de errores de Postgres/RPC a mensajes
│   │   └── action-result.ts      Tipo uniforme de respuesta de Server Actions
│   └── types/
│       └── database.ts           Tipos generados del esquema
└── vitest.config.ts
```

Regla de dependencias: `app → features → (domain, lib)`; `domain` no importa nada del proyecto salvo tipos; `components/ui` no conoce el dominio.

---

## 3. Modelo de base de datos

### 3.1 Diagrama

```
auth.users 1─1 profiles 1─* group_members *─1 groups 1─* seasons
                  │                                 │
                  └──0..1 players *──────────────────┤ (players.profile_id opcional)
                          │  1─* player_positions    │
                          │  1─* player_aliases      ├─* invitations (opcionalmente para un player)
                          │                          ├─* team_constraints (Fase 4)
                          │                          └─* audit_logs
                          │
groups 1─* matches 1─* match_participants *─1 players
               │  1─2 teams 1─* team_members  (match_id, player_id) ⊂ match_participants
               │  1─* match_events   (gol / gol en contra / asistencia)
               │  1─* match_ratings  (votante, votado) ⊂ team_members — anónimas
               └─ player_skill_history (Fase 4, caché reconstruible del motor)
```

### 3.2 Decisión central: *jugador* ≠ *usuario*

Un **jugador** (`players`) es una ficha dentro de un grupo. Puede existir **sin cuenta**: el admin carga a "Vece" aunque nunca se registre, y sus estadísticas se acumulan igual. Cuando esa persona se suma, **reclama su ficha** (o el admin le manda una invitación ligada a ella) y queda vinculada a su perfil. Así:

- el grupo funciona desde el primer día aunque solo el admin use la app;
- no se duplican personas al importar listas de WhatsApp;
- una misma persona tiene una ficha distinta por grupo (estadísticas separadas, como pide el producto).

### 3.3 Tablas

Convenciones: PK `uuid` (`gen_random_uuid()`), `created_at`/`updated_at` `timestamptz`, nombres en inglés en la base y en español en la UI. Las tablas hijas de un grupo llevan `group_id` con **FK compuestas** (`(player_id, group_id) → players(id, group_id)`), lo que garantiza a nivel de base que nunca se mezclen jugadores de un grupo en partidos de otro, y simplifica las políticas RLS.

**Enums**: `group_role (admin, player)` · `player_position (goalkeeper, defender, midfielder, forward)` · `dominant_foot (right, left, both)` · `match_status (scheduled, in_progress, finished, cancelled)` · `participant_status (confirmed, reserve, dropped)` · `team_side (a, b)` · `match_event_type (goal, own_goal, assist)`.

| Tabla | Columnas clave | Restricciones e índices |
|---|---|---|
| `profiles` | `id` (= `auth.users.id`), `display_name`, `avatar_url` | Creado por trigger al registrarse. |
| `groups` | `name`, `slug`, `description`, `timezone`, `default_players_per_team`, `voting_window_hours`, `ranking_min_matches`, `created_by` | `slug` único con formato validado; rangos con `check`. |
| `group_members` | PK (`group_id`, `profile_id`), `role` | Índice por `profile_id`. Trigger: no se puede quitar o degradar al último admin. Solo `role` es actualizable (privilegio por columna). |
| `players` | `group_id`, `profile_id?`, `nickname`, `nickname_normalized` (generada), `full_name?`, `avatar_url?`, `dominant_foot?`, `base_rating` (1–10, nivel inicial provisional), `is_active` | `unique (group_id, nickname_normalized)` evita duplicados "Juanchi"/"juanchi"/"Juánchi". `unique (group_id, profile_id)`: una ficha por persona y grupo. Trigger: un jugador que edita su propia ficha no puede tocar `base_rating`, `nickname`, `is_active` ni el vínculo. |
| `player_positions` | PK (`player_id`, `position`), `priority` (1 principal, 2 secundaria) | `unique (player_id, priority)`. |
| `player_aliases` | `player_id`, `alias`, `alias_normalized` | `unique (group_id, alias_normalized)`. Memoria del importador: "Juan Cruz" → Juanchi. |
| `seasons` | `name`, `starts_on`, `ends_on?` | Trigger anti-solapamiento. El partido pertenece a la temporada por **fecha** (no se guarda `season_id`: no hay dato derivado que se desincronice si se edita una temporada). |
| `invitations` | `token` (≈244 bits aleatorios), `role`, `player_id?`, `max_uses?`, `use_count`, `expires_at?`, `revoked_at?` | Solo admins las leen. Si está ligada a un jugador, `max_uses = 1`. Se consumen con bloqueo de fila (sin carreras). |
| `matches` | `scheduled_at`, `venue`, `players_per_team`, `status`, `notes`, `finished_at`, `voting_closes_at`, `mvp_player_id?`, `mvp_source (votes/admin)` | `check`: finalizado ⇒ `finished_at`. Índice (`group_id`, `scheduled_at desc`). |
| `match_participants` | PK (`match_id`, `player_id`), `status` | La convocatoria (incluye suplentes y bajas). |
| `teams` | `match_id`, `side`, `name`, `score?` | `unique (match_id, side)`. El **resultado oficial** es el `score` cargado (puede haber goles sin autor conocido). |
| `team_members` | PK (`match_id`, `player_id`), `team_id` | La PK impide que un jugador esté en dos equipos; FK a `match_participants` impide meter a alguien no convocado. |
| `match_events` | `team_id`, `player_id?`, `event_type`, `minute?` | Trigger: el autor de gol/asistencia pertenece al equipo acreditado; el de gol en contra, al rival. La RPC de resultado valida goles asignados ≤ marcador. |
| `match_ratings` | `rater_player_id`, `rated_player_id`, `score` (1–10) | `unique (match_id, rater, rated)` = un voto por par y partido; `check (rater ≠ rated)`; FK de ambos a `team_members` = solo votan y son votados quienes jugaron. **Sin políticas de escritura**: solo se vota por RPC. **Lectura: cada usuario ve únicamente sus propios votos.** |
| `audit_logs` | `group_id`, `actor_id`, `action`, `entity_type`, `entity_id`, `old_data`, `new_data` | Escritos solo por triggers. Lectura: admins del grupo. **`match_ratings` no se audita** (rompería el anonimato). |
| `team_constraints` *(Fase 4)* | `player_a`, `player_b`, `kind (together/apart)` | Restricciones persistentes del grupo para el armado. |
| `player_skill_history` *(Fase 4)* | `player_id`, `match_id`, `skill`, `confidence`, `components`, `engine_version` | Caché reconstruible del motor de valoración (se puede borrar y recalcular). |

### 3.4 Seguridad en la base (RLS)

Funciones auxiliares `SECURITY DEFINER` (evitan recursión entre políticas): `is_group_member(group_id)`, `is_group_admin(group_id)`, `shares_group_with(profile_id)`.

| Recurso | Leer | Escribir |
|---|---|---|
| `profiles` | propio o compañeros de grupo | solo el propio |
| `groups` | miembros | admins (crear vía RPC `create_group`) |
| `group_members` | miembros | rol: admins · baja: admin o uno mismo · alta: solo RPC |
| `players`, `player_positions`, `player_aliases`, `seasons` | miembros | admins; el jugador vinculado edita datos no sensibles de su ficha |
| `invitations` | admins | admins · consumo vía RPC `accept_invitation` · vista previa vía `get_invitation_preview` |
| `matches`, `match_participants`, `teams`, `team_members`, `match_events` | miembros | admins (resultados vía RPC transaccional) |
| `match_ratings` | **solo los votos propios** | solo RPC `submit_match_ratings` |
| agregados de votos | miembros, **solo con la votación cerrada** (RPC) | — |
| `audit_logs` | admins | solo triggers |

RPC principales: `create_group`, `get_invitation_preview`, `accept_invitation`, `claim_player`, `create_own_player`, `save_player`, `create_match`, `set_match_teams`, `record_match_result`, `submit_match_ratings`, `get_match_rating_summary`.

Las funciones con `SECURITY DEFINER` fijan `search_path = ''`, califican todos los nombres, verifican pertenencia y rol al inicio, y tienen `EXECUTE` revocado a `public`/`anon` salvo la vista previa de invitación.

### 3.5 Migraciones

`supabase/migrations/<timestamp>_<nombre>.sql`, aplicadas con `supabase db push`. Cada migración se prueba en CI aplicándola sobre PGlite con un esquema `auth` simulado (`supabase/tests`). Los tipos de TypeScript se regeneran con `npm run db:types`.

---

## 4. Mapa de navegación

```
Público
  /                         Landing
  /ingresar                 Login
  /registro                 Alta de cuenta
  /recuperar                Pedir mail de recuperación
  /nueva-clave              Definir nueva contraseña (desde el mail)
  /invitacion/[token]       Vista previa → (login si hace falta) → aceptar → vincular ficha

Privado
  /inicio                   Mis grupos · próximos partidos · votaciones pendientes
  /perfil                   Nombre, avatar, contraseña, cerrar sesión
  /grupos/nuevo             Crear grupo

  /g/[slug]                 Inicio del grupo: próximo partido, último resultado, top 3, mi ficha
  /g/[slug]/partidos                      Lista (próximos / jugados)            ← Fase 2
  /g/[slug]/partidos/nuevo                Crear partido + importar lista        ← Fase 2
  /g/[slug]/partidos/[id]                 Detalle: convocados, equipos, resultado
  /g/[slug]/partidos/[id]/equipos         Armado manual / automático            ← Fase 2/4
  /g/[slug]/partidos/[id]/resultado       Cargar o corregir resultado           ← Fase 2
  /g/[slug]/partidos/[id]/votar           Votación                              ← Fase 3
  /g/[slug]/jugadores                     Plantel con búsqueda y filtros
  /g/[slug]/jugadores/nuevo               Alta de jugador (admin)
  /g/[slug]/jugadores/[id]                Ficha deportiva
  /g/[slug]/jugadores/[id]/editar
  /g/[slug]/rankings                      Rankings con filtros                  ← Fase 3
  /g/[slug]/historial                     Partidos jugados y comparaciones      ← Fase 3
  /g/[slug]/ajustes                       Datos del grupo · reglas (admin)
  /g/[slug]/ajustes/miembros              Miembros y roles (admin)
  /g/[slug]/ajustes/invitaciones          Links de invitación (admin)
  /g/[slug]/ajustes/temporadas            Temporadas (admin)
  /g/[slug]/ajustes/auditoria             Registro de cambios (admin)           ← Fase 2
```

Navegación móvil dentro de un grupo: barra inferior con **Inicio · Partidos · Plantel · Rankings · Más**. En escritorio, la misma estructura en una barra lateral. Fuera de un grupo, el selector de grupo vive en el encabezado.

---

## 5. Pantallas

| Pantalla | Contenido | Estados |
|---|---|---|
| **Landing** | Propuesta de valor, mock de tarjeta de jugador, CTA "Crear mi grupo" / "Ingresar". | — |
| **Ingresar / Registro / Recuperar** | Formularios cortos, errores en línea, aviso de confirmación de email. | Cargando, error de credenciales, email no confirmado. |
| **Inicio** | Tarjetas de mis grupos (rol, próximo partido), votaciones pendientes con cuenta regresiva, CTA crear/unirse. | Vacío: "Todavía no estás en ningún grupo" con dos caminos. |
| **Crear grupo** | Nombre, descripción, jugadores por equipo, tu apodo en el grupo. | — |
| **Inicio del grupo** | Encabezado con nombre/temporada; próximo partido; último resultado; top 3 por valoración; mi ficha resumida; accesos de admin. | Grupo recién creado: checklist (cargar jugadores → invitar → crear partido). |
| **Plantel** | Grilla de tarjetas de jugador (valoración, posición, PJ), búsqueda, filtro por posición, inactivos ocultos. | Vacío con CTA "Cargar jugadores". |
| **Ficha de jugador** | Tarjeta grande (valoración, posiciones, pierna), estadísticas (PJ, G-E-P, % victorias, goles, asistencias, MVP), evolución (gráfico), últimos partidos, comparador. Badge "provisional" si tiene pocos partidos. | Sin partidos: estadísticas en cero con explicación. |
| **Alta/edición de jugador** | Apodo, nombre, posición principal/secundaria, pierna, nivel inicial (slider con descripción por tramo). | Error de apodo duplicado. |
| **Ajustes del grupo** | Datos, reglas (ventana de votación, mínimo de partidos para rankings), miembros con roles, invitaciones (crear, copiar, compartir por WhatsApp, revocar), temporadas. | Confirmaciones para acciones destructivas. |
| **Invitación** | Nombre del grupo, quién invita, rol; si no hay sesión → login/registro y vuelve; tras aceptar → "¿Cuál de estos sos vos?" (fichas sin vincular) o crear la propia. | Inválida, vencida, revocada, ya sos miembro. |
| **Crear partido** *(F2)* | Fecha/hora/cancha/formato; convocatoria por selección o pegando la lista de WhatsApp con revisión de coincidencias. | Nombres ambiguos o nuevos requieren confirmación. |
| **Armado de equipos** *(F2/F4)* | Dos columnas (azul/rojo), arrastrar o tocar para mover, fijar jugadores, restricciones; botón "Generar parejos" con nivel promedio por equipo, barra de equilibrio y explicación; "Otra alternativa". | Cantidad impar / insuficiente. |
| **Resultado** *(F2)* | Marcador, steppers de goles y asistencias por jugador, gol en contra, destacado, observaciones. | Validación goles ≤ marcador; corrección con registro. |
| **Votación** *(F3)* | Lista de compañeros y rivales con selector 1–10 rápido, progreso, cierre con cuenta regresiva. | Ya votaste (editable hasta el cierre), votación cerrada. |
| **Rankings** *(F3)* | Pestañas por ranking, filtro de temporada y mínimo de partidos, podio animado. | Sin datos suficientes. |
| **Historial** *(F3)* | Partidos con marcador, goleadores, MVP; detalle con calificaciones publicadas; comparación entre fechas. | — |

Identidad visual: fondo azul casi negro (`#060A14`), superficies `#0C1322`, azul eléctrico de acción (`#2F7CFF`), verde de victoria (`#22D07A`), rojo rival (`#FF4D5E`), dorado para MVP. Tipografía de display condensada (Barlow Condensed) para números y títulos, Inter para texto. Tarjetas de jugador propias con tiers de color según valoración — inspiradas en el lenguaje de los juegos deportivos, sin copiar formas ni marcas.

---

## 6. Sistema de estadísticas y valoración

### 6.1 Tres conceptos que no se mezclan

| Concepto | Qué es | De dónde sale |
|---|---|---|
| **Estadísticas** | Hechos contables: PJ, G/E/P, goles, asistencias, MVP, % victorias. | Vistas SQL sobre `team_members`, `teams`, `match_events`. |
| **Rendimiento del partido** (*P*) | Qué tan bien jugó alguien *ese día* según sus compañeros y rivales. | Votos 1–10 de ese partido, depurados. |
| **Habilidad estimada** (*S*) | Cuán bueno es el jugador, con incertidumbre. Es lo que usa el armado de equipos. | Motor de valoración que integra rendimientos, resultados y aportes a lo largo del tiempo. |

### 6.2 Rendimiento de un partido (*P*)

1. **Corrección por votante**: si un votante calificó a 3+ jugadores, sus votos se centran respecto de su propia media en ese partido (neutraliza al que pone 9 a todos o 3 a todos).
2. **Media recortada**: con 5+ votos se descartan el máximo y el mínimo (limita el efecto de un voto malintencionado o de un "acuerdo" entre dos).
3. **Contracción bayesiana**: `P = (k·μ + n·x̄) / (k + n)` con `k = 2` y `μ` = media del partido. Con pocos votos *P* queda cerca de la media; con muchos, refleja lo votado.
4. Sin votos válidos → no hay *P* para ese partido (no se inventa).

### 6.3 Habilidad estimada (*S*)

Escala interna 1–10 (se muestra también como valoración 10–99 en la tarjeta). Tres componentes:

| Componente | Peso por defecto | Idea |
|---|---|---|
| **Votos** (*S_v*) | 0.65 | Promedio móvil de *P* con paso adaptativo `α_n = max(α_min, 1/(n + n₀))`, `n₀ = 3`, `α_min = 0.12`. El primer partido mueve la valoración solo ¼ del camino; después de muchos, un partido aislado pesa ~12%. |
| **Resultados** (*S_r*) | 0.25 | Ajuste tipo Elo por equipo: esperado `E = 1 / (1 + 10^((R_rival − R_propio)/D))`, actualización `K·(resultado − E)·g(dif. de gol)`. Premia ganar contra equipos más fuertes y captura el aporte de defensores y arqueros que no hacen goles. |
| **Aporte ofensivo** (*S_o*) | 0.10 | `(goles + 0.7·asistencias)` por partido **relativo a lo esperable para su posición** (a un defensor no se le exige lo de un delantero), contraído hacia la media. Peso bajo a propósito. |

`S = Σ wᵢ·Sᵢ` con pesos renormalizados cuando falta un componente (p. ej., partido sin votos). Pesos y parámetros viven en un objeto de configuración versionado (`engine v1`), ajustable por grupo en el futuro.

**Jugadores nuevos**: arrancan en `base_rating` (nivel inicial que fija el admin; si no lo fija, la media del grupo). La **confianza** `c = 1 − e^(−n/4)` crece con los partidos; hasta 3 partidos se marca "provisional". La incertidumbre `σ` decrece con `c` y el armado de equipos la usa para repartir "incógnitas".

**Robustez**: un solo partido nunca define a nadie (paso inicial chico + contracción), una mala tarde no hunde a un jugador establecido (`α_min`), y los goles no definen la calidad por sí solos (peso bajo y relativo a la posición).

### 6.4 Métricas para rankings

| Ranking | Métrica | Mínimo |
|---|---|---|
| Mejor jugador general | Valoración conservadora `S − 1·σ` (premia nivel alto y sostenido) | `ranking_min_matches` |
| Goleador / Asistidor / MVP | Totales (desempate: por partido) | — |
| Mejor promedio | Media de *P* | mínimo de partidos con votos |
| % de victorias | `(PG + 0.5·PE) / PJ` | mínimo de partidos |
| Más regular | Menor desvío de *P* (mostrado como "regularidad" 0–100) | 5 partidos con votos |
| Mejor momento | Media de *P* de los últimos 5 menos *S* (tendencia) | 3 de los últimos 5 |

Filtros: temporada (por rango de fechas), grupo, mínimo de partidos.

### 6.5 Recalcular en vez de migrar

El motor es `computeRatings(historial, config) → { porJugador, porPartido }`, determinista. Se ejecuta en el servidor al pedir rankings/fichas (cientos de partidos se procesan en milisegundos). En la Fase 4 se persiste en `player_skill_history` como caché con `engine_version`: si cambia la fórmula se borra y se recalcula.

---

## 7. Algoritmo de armado de equipos (primera propuesta)

### 7.1 Entrada y validación

- Convocados confirmados (sin suplentes ni bajas), con *S*, σ, forma reciente y posiciones.
- Restricciones: jugadores **fijados** a un equipo, pares **juntos**, pares **separados**.
- Cantidad: mínimo 6; si es impar, un equipo queda con uno más y la comparación por **suma** compensa (el equipo corto recibe jugadores algo mejores).

### 7.2 Función de costo (menor = más parejo)

```
J(A,B) =  w_nivel · |ΣS_A − ΣS_B| / tamaño
        + w_pos   · penalización_posiciones      (arqueros repartidos; defensas y delanteras parejas,
                                                   secundaria cuenta 0.5)
        + w_forma · |Σforma_A − Σforma_B| / tamaño
        + w_inc   · |Σσ²_A − Σσ²_B|              (no concentrar "desconocidos" en un equipo)
        + w_rep   · solapamiento con los equipos del partido anterior (variedad, opcional)
restricciones duras (fijados, juntos, separados) → combinación descartada
```

### 7.3 Búsqueda

```
si n ≤ 22:                              # C(22,11)/2 ≈ 352.000 combinaciones
    búsqueda exhaustiva:
      - el jugador 0 siempre en A (simetría: cada partición se evalúa una vez)
      - poda por restricciones antes de evaluar
      - costo incremental al recorrer combinaciones
sino:
    heurística:
      - semillas: draft en serpiente por S + varias aleatorias (seed reproducible)
      - búsqueda local: mejor intercambio 1×1 hasta no mejorar
      - recocido simulado corto para escapar de mínimos locales
conservar top K (K=5) soluciones DISTINTAS (difieren en ≥ 2 jugadores)
```

Para partidos de amigos (10–22 jugadores) siempre se usa la búsqueda exhaustiva: **el resultado es el óptimo garantizado** para la función de costo, en menos de 200 ms en el navegador o en el servidor.

### 7.4 Salida

- Equipos, nivel promedio de cada uno, diferencia en % y barra de equilibrio.
- "Otra alternativa" recorre las K mejores (no reordena al azar).
- Explicación generada a partir de las métricas, por ejemplo:
  - "Diferencia de nivel: 0,3 puntos (1,8 %)."
  - "Un arquero por equipo; defensas 2–2, delanteros 2–2."
  - "Los 2 jugadores nuevos quedaron separados."
  - "Brito y Manu juegan separados (restricción)."

---

## 8. Roadmap del MVP

| Fase | Alcance | Entregable verificable |
|---|---|---|
| **1 — Fundación** *(esta entrega)* | Proyecto, sistema de diseño, esquema completo con RLS y tests en PGlite, auth (registro, login, recuperación), perfil, grupos, invitaciones con reclamo de ficha, plantel (alta, edición, posiciones, baja lógica), temporadas. | Un admin crea su grupo, carga el plantel, invita por WhatsApp y los invitados se vinculan a su ficha. |
| **2 — Partidos** | Crear partido, convocatoria, importador de listas de WhatsApp con matching y confirmación, armado manual, carga y corrección de resultado (goles, asistencias, destacado), auditoría visible. | Un partido completo desde la lista de WhatsApp hasta el resultado. |
| **3 — Estadísticas** | Votación anónima con cierre, motor de valoración v1, fichas con estadísticas y evolución, rankings con filtros y mínimos, historial. | Después de votar, se publican calificaciones y se actualizan fichas y rankings. |
| **4 — Equipos inteligentes** | Optimizador (exhaustivo + heurística), restricciones persistentes, alternativas, explicación, caché de valoraciones. | "Generar parejos" produce equipos explicados y reproducibles. |
| **5 — Mejoras** | Premios y logros, rivalidades/duelos, predicción de resultado, tarjetas para compartir (imagen OG), análisis avanzados, notificaciones. | Logros en la ficha y en el partido, Salón de la fama, duplas y rivales, "Precisión del pronóstico", imágenes 1080×1350 para compartir y página de análisis, todo calculado al leer sin tablas nuevas (D-035 a D-041). Pronósticos de los miembros y notificaciones quedan para más adelante: necesitan almacenamiento propio. |

Calidad transversal en todas las fases: tests de reglas de negocio (dominio + RLS), estados de carga/vacío/error en cada pantalla, confirmación de acciones destructivas, auditoría de cambios relevantes.

---

## 9. Decisiones que conviene confirmar

Adopté un valor por defecto para avanzar; cualquiera se puede cambiar (ver [`DECISIONES.md`](./DECISIONES.md)).

1. **Fichas sin cuenta y reclamo posterior** (sección 3.2). Alternativa: exigir que cada jugador tenga cuenta (más fricción, menos datos).
2. **Quién vota**: solo quienes jugaron el partido y tienen cuenta vinculada. Nadie, ni los admins, ve votos individuales ajenos.
3. **Ventana de votación**: 48 h por defecto, configurable por grupo; las calificaciones se publican al cerrar.
4. **MVP**: se define por votos al cerrar la votación (mejor *P* con al menos 3 votos). Si no hay votos suficientes, el admin puede marcar un destacado.
5. **Resultado oficial** = marcador cargado; los goles con autor pueden ser menos que el marcador (goles "sin asignar").
6. **Login con email y contraseña** en el MVP. Google se puede agregar después (requiere configurar un proyecto en Google Cloud).
7. **Dos equipos por partido** en el MVP (el modelo admite extender a más).
8. **Borrar un grupo** no está en el MVP; borrar jugadores solo si no tienen partidos (si no, se desactivan).
9. **Temporadas**: al crear el grupo se abre la temporada del año en curso.
