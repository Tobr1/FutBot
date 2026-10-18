# Registro de decisiones

Formato breve: contexto → decisión → consecuencias. Las más nuevas, arriba.

## D-021 · Galería `/ui-kit` solo en desarrollo
Los componentes del rediseño móvil (tokens, botones, hojas inferiores, tarjetas, skeletons) se revisan juntos en `/ui-kit`, con datos de ejemplo y sin Supabase. En producción la ruta responde 404 (`notFound()` cuando `NODE_ENV === "production"`), así no queda expuesta ni indexada. No reemplaza a los tests: sirve para revisar contraste, tamaños táctiles y estados en el celular.

## D-020 · Transiciones de pantalla con `<ViewTransition>` y LazyMotion estricto
Las páginas se deslizan según la dirección (`nav-forward` al profundizar, `nav-back` al volver) con el `<ViewTransition>` de React 19 (`ScreenTransition` en cada `page.tsx`, `SkeletonTransition` en cada `loading.tsx`); el encabezado y la barra inferior quedan anclados. Para gestos (arrastrar hojas, la píldora de la barra) se usa `motion` dentro de `LazyMotion strict`, solo con componentes `m.*`. Solo se animan `transform` y `opacity`, nada dura más de 400 ms, nada anima durante el prerender y con movimiento reducido todo se desactiva.

## D-019 · PWA instalable que abre en el último grupo
Manifest, íconos generados (`apple-icon`, 192/512 y maskable), `viewport-fit=cover` con márgenes de área segura y `start_url` `/abrir`, que redirige al último grupo visitado o a Mis grupos. El último grupo se guarda en la cookie `fb_last_group`, que el proxy actualiza solo en cargas de documento de `/g/[slug]` (nunca en prefetches, que mentirían sobre dónde estuvo el usuario). Con sesión, `/` también redirige a ese destino en lugar de mostrar la landing. El aviso sin conexión usa `useOffline` (experimental de Next 16.4): Next deja en espera navegaciones y Server Actions y las reintenta al volver la señal. Todavía no hay service worker: el modo offline real (caché de pantallas y cola de cargas) queda para cuando haya datos de partidos que lo justifiquen.

## D-018 · Tokens: `--primary` brillante y `--primary-solid` para rellenos
Un solo acento azul eléctrico con dos tonos: `--primary` (brillante, 6,2:1 sobre el fondo) para texto, íconos, anillos y selección, y `--primary-solid` (4,69:1 con texto blanco) para botones y superficies rellenas. La combinación `bg-primary` + `text-primary-foreground` queda prohibida. Verde = victoria o positivo, rojo = rival, derrota o destructivo, dorado = MVP y premios; las posiciones tienen tonos propios de baja saturación que nunca se usan como semántica. Barlow Condensed carga solo 700 y 800 y se reserva para títulos, nombres en tarjetas y números; el resto es Inter, nunca por debajo de 11 px.

## D-017 · Hojas inferiores propias en el celular, menús desplegables en escritorio
En el teléfono los menús y acciones contextuales se abren como hoja inferior (al alcance del pulgar), no como desplegables desde una esquina superior. `BottomSheet` está hecho sobre el Dialog de Radix más `motion` para arrastrar y cerrar; se descartó `vaul` porque duplicaba `@radix-ui/react-dialog` fuera del paquete `radix-ui` y su mantenimiento es incierto. `ResponsiveMenu` arma el mismo menú como `DropdownMenu` desde 1024 px y como hoja inferior debajo. Dialog y AlertDialog se anclan abajo en pantallas chicas solo con CSS.

## D-016 · "Más" como ruta en lugar de la pestaña "Grupo"
La barra inferior del grupo queda en Inicio · Partidos · Plantel · Rankings · Más. "Más" es una página (`/g/[slug]/ajustes`) y no una hoja, para que los links directos y el botón atrás sean deterministas. El formulario general del grupo pasa a `/g/[slug]/ajustes/general`, las píldoras de navegación de ajustes desaparecen y cada subpágina vuelve a "Más" con un encabezado con botón atrás.

## D-015 · Partidos y rankings como "próximamente" en la Fase 1
La navegación del grupo ya incluye Partidos y Rankings para fijar la estructura final, pero muestran qué llega en cada fase en lugar de pantallas vacías o datos inventados. El esquema y las RPC de esas fases ya están implementados y testeados.

## D-014 · Avatares redimensionados en el navegador
Las fotos se recortan a 256×256 WebP en el cliente y se suben a Storage (`avatars/<uid>/avatar.webp`, una por cuenta, versión en la URL para invalidar caché). Sin servicios pagos de imágenes; la política de Storage limita cada cuenta a su carpeta y la Server Action valida el prefijo de la URL.

## D-013 · El nivel inicial es visible para el grupo
`players.base_rating` es la valoración provisional que muestra la tarjeta hasta que el motor de la Fase 3 la reemplace. Es visible para todos los miembros (como en los juegos deportivos) y solo la editan admins. Si genera fricción, se puede ocultar en una fase posterior sin cambiar el modelo.

## D-012 · Errores de RPC con claves estables
Las funciones SQL lanzan `raise exception '<clave>'` (por ejemplo `invitation_expired`). La app traduce la clave a un mensaje en español en `src/lib/errors.ts`. Así los mensajes se cambian sin migrar la base y los tests verifican claves, no textos.

## D-011 · Tipos de la base generados con PGlite
Sin Docker no se puede usar `supabase gen types --local`. `scripts/gen-db-types.ts` aplica las migraciones en PGlite, introspecciona el catálogo y escribe `src/types/database.ts` con el mismo formato que el generador oficial. Con un proyecto remoto vinculado también sirve `supabase gen types --project-id`.

## D-010 · Next.js 16 con Cache Components
Se mantiene `cacheComponents` (default de `create-next-app` 16.4). Toda lectura de sesión va dentro de `<Suspense>`; los layouts no leen la sesión en su nivel superior. El refresco de token vive en `src/proxy.ts` (el antiguo middleware).

## D-009 · Temporada por fecha
Los partidos no guardan `season_id`; pertenecen a la temporada cuyo rango contiene la fecha local del partido (zona horaria del grupo). Evita datos derivados desincronizados al editar temporadas.

## D-008 · Votos invisibles incluso para admins
`match_ratings` solo es legible por quien emitió el voto. Los agregados se exponen con una RPC que exige votación cerrada. La tabla no tiene trigger de auditoría para no registrar identidades de votantes.

## D-007 · Sin service role key en la aplicación
Las operaciones privilegiadas son funciones `SECURITY DEFINER` con verificaciones explícitas, `search_path = ''` y `EXECUTE` revocado a `public`. La app usa siempre el token del usuario.

## D-006 · FK compuestas con `group_id`
Las tablas hijas guardan `group_id` y referencian `(id, group_id)` del padre. La base garantiza que no se mezclen datos de grupos distintos y las políticas RLS no necesitan joins.

## D-005 · Resultado oficial = marcador cargado
`teams.score` es la fuente de verdad del resultado. Los eventos de gol pueden ser menos que el marcador (autor desconocido), nunca más.

## D-004 · Jugador (ficha) separado de usuario (cuenta)
Ver `ANALISIS.md` §3.2. Las fichas pueden existir sin cuenta y se reclaman al unirse al grupo.

## D-003 · Escala de valoración 1–10
Coincide con la escala de votación. En la UI se muestra además como valoración 10–99 en la tarjeta del jugador.

## D-002 · Español rioplatense, sin i18n en el MVP
Textos en español (voseo). La estructura no impide agregar i18n después.

## D-001 · Stack
Next.js 16 + React 19 + TypeScript estricto + Tailwind 4 + shadcn/ui (Radix) + Supabase. Vitest + PGlite para tests. Hosting gratuito (Vercel + Supabase).
