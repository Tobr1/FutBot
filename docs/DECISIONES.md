# Registro de decisiones

Formato breve: contexto → decisión → consecuencias. Las más nuevas, arriba.

## D-046 · El producto se llama FutBot
El nombre visible pasa de FUTBOLEROS a **FutBot** (igual que el repositorio y el proyecto de Vercel). El logo se escribe Fut**Bot** con "Bot" en azul eléctrico, sin mayúsculas forzadas; el resto de la app toma el nombre de `BRAND` en `src/lib/brand.ts`. Las migraciones ya aplicadas conservan el nombre viejo en sus comentarios: no se reescriben migraciones que ya corrieron.

## D-045 · Correcciones coherentes y cambios de hora "compatibles"
- **MVP:** si una corrección de equipos saca al MVP de los dos equipos, `set_match_teams` lo borra, venga del admin o de los votos (migración `20261019000600`). Si era por votos, `finalize_match_voting` lo vuelve a elegir con los votos que quedan. "Corregir resultado" no precarga un MVP que ya no está en un equipo.
- **Notas:** en `record_match_result`, `p_notes` null deja las notas como están y `''` las borra, igual que al editar el partido.
- **Premios del mes:** un mes no se cierra mientras algún partido suyo tenga la votación abierta. El MVP elegido por votos se fija recién cuando alguien abre el partido (D-028), así que hasta entonces el MVP del mes todavía puede cambiar.
- **Fechas:** `zonedDateTimeToIso` resuelve los cambios de horario como Temporal y Postgres. Una hora repetida toma su primer instante. Una hora que no existe se corre hacia adelante lo que dura el salto. Así una fecha nunca cae en el día anterior, y "00:00" es siempre el primer instante del día local, que es lo que usan los límites de temporada.
- **Fijados:** al aplicar una alternativa, los fijados siguen a su jugador, igual que al moverlo a mano (D-032).
- **Redirecciones:** `safeNextPath` rechaza también barras invertidas y caracteres de control, porque el parser de URL descarta tabs y saltos de línea, y `/\t/otro-sitio` terminaba en otro origen.

## D-044 · Listas con datos anidados embebidos por el `max-rows` de PostgREST
PostgREST corta cada respuesta en 1000 filas sin avisar, también la de un `.in("match_id", ids)` aparte. Las listas de partidos ("Partidos" y el historial, que acumula hasta 500) piden convocatoria, equipos y goles embebidos en la consulta de `matches` (`match_participants!…(status)`, `teams!…`, `match_events!…`): el límite cuenta solo las filas de partidos y la URL no lleva cientos de ids. Las lecturas de todo el grupo (`player_match_lines`, `get_rating_aggregates`) siguen paginando de a 1000 (D-025) y, si pasaran el tope de 100 000 filas, fallan en lugar de devolver un historial cortado. Si algún día se baja `max-rows` del proyecto, hay que bajar igual el tamaño de página de `fetchAll`.

## D-043 · Reglas de armado únicas por pareja, sin importar orden ni tipo
`team_constraints` tiene un índice único sobre `(group_id, least(player_a, player_b), greatest(player_a, player_b))`: A-B y B-A son la misma regla, y una pareja no puede estar a la vez "juntos" y "separados". Para cambiar el tipo se borra la regla y se crea otra (no hay UPDATE). El intento repetido devuelve `team_constraints_pair_key`, que `src/lib/errors.ts` traduce a "Ya hay una restricción para esos dos jugadores.". Así el optimizador nunca recibe contradicciones guardadas; las que surgen con los fijados de la sesión se detectan antes de optimizar (D-032).

## D-042 · Cualquier miembro refresca la caché del motor
`replace_skill_history` (migración `20261019000500`) es `SECURITY DEFINER` y la puede llamar cualquier miembro del grupo, no solo admins: los valores son deterministas a partir de datos que ese miembro ya puede leer (líneas de partido y agregados de votaciones cerradas) y la caché se dispara al ver un partido recién cerrado (D-027), que lo hace cualquiera. La RPC valida rangos, que jugadores y partidos sean del grupo, sin pares repetidos y hasta 5000 filas, y serializa refrescos concurrentes con un advisory lock. Lo peor que puede hacer un miembro malicioso es escribir valores en rango pero falsos en una caché que ninguna pantalla lee (D-026); se reconstruye con la próxima sincronización. Con más de 5000 filas (unos 350 partidos de 7 contra 7) la app deja de sincronizar: si algún día se lee la caché, habrá que partir el envío.

## D-041 · Votaciones pendientes también en Mis grupos
`/inicio` muestra el mismo aviso "Votación abierta" que el inicio del grupo, pero con las votaciones de todos los grupos donde tengo ficha (`listMyPendingVotings`, que reutiliza `listPendingVotings` por ficha). Con más de un grupo, el aviso dice de qué grupo es. La hora se lee después de `connection()`.

## D-040 · Análisis del grupo en su propia página
`/g/[slug]/analisis` (filtro de temporada en la URL, como rankings) junta goles por partido con la media de los últimos 5 (recharts, solo en el cliente), el reparto Azul / empate / Rojo con goles por partido, diferencia media y partidos por un gol, la precisión del pronóstico, el ranking de duplas y la asistencia. Todo sale de `player_match_lines` ya cargado por request: no suma consultas. Rankings y "Más" enlazan acá y al Salón de la fama; las dos rutas activan la pestaña Rankings.

## D-039 · Imágenes para compartir con sesión, no públicas
El resultado de un partido jugado y la ficha de un jugador se comparten como PNG 1080×1350 generados con `ImageResponse` en route handlers (`/g/[slug]/partidos/[id]/imagen` y `/g/[slug]/jugadores/[id]/imagen`). Los handlers verifican sesión y membresía con `findGroupContext` (la variante de `getGroupContext` que devuelve null en lugar de redirigir) y leen con el token del usuario, así RLS sigue de última barrera; sin acceso responden 404 (no revelan si el grupo existe) y nunca se cachean (`private, no-store`). El arte usa solo flexbox, colores en hex y la fuente por defecto de next/og: sin emojis ni imágenes remotas, el render no depende de la red. "Compartir" baja la imagen al tocar (se precarga al apoyar el dedo) y usa `navigator.share({ files })`; si no se puede, la descarga. Al lado, WhatsApp con el resultado en texto y el link. Se descartó una imagen OG pública por partido: expondría datos de un grupo privado a cualquiera con el link.

## D-038 · "Pronóstico del sistema" medido contra la historia, sin pronósticos de miembros
Pronosticar entre miembros necesita guardar cada pronóstico (tabla nueva, RLS, cierre): queda para más adelante. En su lugar se mide el pronóstico que ya existe: para cada partido jugado se calcula `winProbability` con la habilidad S de cada jugador antes del partido (el punto anterior de su historia en el motor o, en el debut, el nivel inicial o la media del grupo, igual que el motor) y se compara con el resultado. Acierto = ganó el favorito (un empate cuenta como error; sin favorito no cuenta). Se informa además el Brier de tres resultados y una calibración por rangos de probabilidad del favorito ("Parejo", "Favorito leve", "Favorito claro").

## D-037 · Duplas y rivales con mínimo de 3 partidos
Socio ideal = compañero con mejor efectividad juntos ((PG + PE/2) / PJ) con al menos 3 partidos juntos y alguna victoria. Rival favorito = rival al que más veces le ganó (con al menos 3 enfrentamientos y más victorias que derrotas). Némesis = rival con peor efectividad en contra (al menos 3 enfrentamientos y más derrotas que victorias). Cada fila abre el comparador (`?con=`). El ranking de duplas del grupo usa el mínimo de partidos del grupo con piso de 3, para que dos victorias seguidas no pongan a una dupla primera.

## D-036 · Logros y récords se calculan al leer, sin tablas
Como la valoración (D-025), los logros salen de `player_match_lines`, las calificaciones del motor y las temporadas cada vez que se leen (`src/domain/awards`, puro y testeado; memoizado por request). No hay migraciones: si cambia una regla, cambia el historial completo de logros. El id de cada logro es estable (`tipo:jugador:contexto`) por si algún día se guardan para notificar. Los récords del grupo, a igualdad, son de quien los logró primero.

## D-035 · Catálogo de logros y premios del mes
Por partido: Hat-trick (3+ goles, oro), Doblete (2 goles, bronce), Asistidor serial (3+ asistencias, plata), Valla invicta (arquero o defensor cuyo equipo no recibió goles, bronce) y Debut. Por hitos: MVP (1 / 5 / 10), partidos jugados (10 / 25 / 50 / 100), Racha ganadora (3 y 5 victorias seguidas), Invicto (5 sin perder) y Siempre presente (5 / 10 / 20 partidos del grupo seguidos); las rachas se pueden volver a ganar. Por período: Goleador y MVP del mes (mes calendario en la zona del grupo; solo meses cerrados, empates compartidos, el MVP desempata por promedio de calificación) y Mejor promedio de cada temporada terminada (el primero de "Mejor promedio" con el mínimo del grupo). Los tiers usan los tokens de medalla; el dorado queda para oro, MVP y premios. Se ven en la ficha ("Logros" y el progreso al próximo escalón), en el partido ("Destacados del partido"), en el inicio del grupo ("Últimos logros", sin debuts) y en `/g/[slug]/premios` (Salón de la fama).

## D-034 · Alternativas de a una, aplicar no es guardar
"Generar parejos" muestra las 5 mejores alternativas distintas (difieren en 2 jugadores o más) de a una: "Opción 1 de 5", flechas, "Otra alternativa" y deslizar (drag de `m.div`). Cada una trae las listas, el promedio por equipo, la diferencia de nivel en % con la barra de equilibrio, el pronóstico Azul/Empate/Rojo (`winProbability`) y la explicación de `explainSplit` con los nombres actuales de los equipos; en voz baja dice si la búsqueda fue exhaustiva o heurística. "Usar estos equipos" solo reparte en el armado: hay que tocar "Guardar equipos" (RPC `set_match_teams`) para persistir, y se puede seguir editando a mano. El armado manual muestra las mismas métricas con `evaluateSplit`. Si las restricciones son imposibles no se muestra nada a medias: un aviso dice qué choca y cómo arreglarlo (soltar fijados o revisar reglas). Con equipos armados y sin jugar, el detalle del partido y el inicio del grupo muestran la tarjeta "Pronóstico".

## D-033 · Variedad con los equipos del último partido jugado
El término de repetición del optimizador recibe los equipos del último partido jugado anterior al que se arma (sin contarlo, por si es una corrección), sacados de `player_match_lines` que ya carga el motor: no suma consultas. Con el peso por defecto (1) solo desempata entre armados casi igual de parejos; nunca empeora el nivel por cambiar caras.

## D-032 · Reglas persistentes del grupo y fijados de la sesión
Dos tipos de restricción con vidas distintas. Las reglas "juntos / separados" son del grupo (`team_constraints`, una por pareja), las ven todos los miembros y solo las cargan o borran admins, en `/g/[slug]/ajustes/reglas` o desde la hoja "Reglas" del armado. Los fijados (un jugador clavado en Azul o Rojo) son de la sesión de armado y no se guardan: se activan con "Fijar" y tocando al jugador en su equipo; si se lo mueve a mano, el fijado lo sigue. Antes de optimizar se juntan (solo jugadores convocados, sin parejas repetidas) y se detectan las contradicciones directas con fijados; las indirectas las informa el optimizador.

## D-031 · El optimizador corre en el navegador
`balanceTeams` es puro y rápido (búsqueda exhaustiva hasta 22 jugadores en ~20 ms; heurística determinista arriba), así que corre en el cliente con los datos que la página ya trae (habilidad S y σ del motor con respaldo en el nivel inicial, forma reciente, posiciones). Se lanza en una transición que primero cede un cuadro para pintar "Buscando el mejor armado…". Sin ida y vuelta al servidor, "Generar de nuevo" después de fijar a alguien es instantáneo y funciona con mala señal; la única escritura sigue siendo "Guardar equipos". Se necesitan 6 titulares o más (`MIN_PLAYERS`); con menos, el armado es manual.

## D-030 · Comparador como subruta con `?con=`
Comparar dos jugadores vive en `/g/[slug]/jugadores/[id]/comparar?con=<otro>` (no en una hoja con datos cargados en el cliente): el link se comparte, el botón atrás funciona y el cara a cara (`get_head_to_head`) se pide en el servidor. Desde la ficha, "Comparar" abre una hoja para elegir al otro jugador; sin `?con=` la página muestra la misma lista.

## D-029 · Filtros de estadísticas en la URL y historial paginado
Rankings e historial leen la temporada (`?temporada=<id>|todas`, por defecto la actual en la zona del grupo) y el mínimo de partidos (`?min=`, por defecto `ranking_min_matches`) de la URL; la pestaña del ranking (`?ranking=`) se cambia en el cliente con `history.replaceState` porque las 8 listas ya llegan calculadas. "Partidos › Jugados" muestra los últimos 20 (antes había un tope fijo de 120) y enlaza al historial, que pagina con `?page=` acumulativo de a 20 (tope 25 páginas) agrupado por mes.

## D-028 · Votación móvil, editable hasta el cierre y MVP perezoso
Cada jugador se califica con una escala 1-10 (radiogroup, 5 × 2 botones de 44 px en el teléfono, 10 en fila desde sm). Se puede enviar una parte y completar o cambiar después: la RPC hace upsert hasta `voting_closes_at`. El texto "Cierra en…" se calcula en el servidor después de `connection()` (no hay reloj en vivo; se actualiza al navegar). Al ver un partido con la votación cerrada y sin MVP, el servidor llama a `finalize_match_voting` (idempotente) y muestra el resultado sin esperar otra carga. En el detalle solo se muestran cantidades de votantes, nunca quiénes.

## D-027 · `player_skill_history` como caché opcional
La caché del motor se sincroniza solo cuando alguien ve un partido con la votación recién cerrada (junto con el MVP perezoso): se recalcula, se compara con lo guardado para `ENGINE_VERSION` y se llama a `replace_skill_history` solo si cambió. Ninguna pantalla lee de la caché y cualquier error se ignora: si se borra o queda vieja, no pasa nada.

## D-026 · La valoración visible es la del motor, con respaldo en el nivel inicial
Tarjetas, listas, ficha, "Top del plantel", tu ficha, el armado manual y los nombres del comparador muestran la habilidad S del motor (histórico completo). Si un jugador no tiene datos se usa `base_rating`, y el distintivo "Provisional" sale de `isProvisional` del motor (menos de 3 partidos). `base_rating` sigue siendo el nivel inicial que edita un admin y el punto de partida del motor. Reemplaza lo provisorio de D-013 y D-022.

## D-025 · Valoración calculada al leer, memoizada por request
`features/stats` carga una vez por request (React `cache`) el plantel, `player_match_lines` y `get_rating_aggregates` del grupo —paginando de a 1000 filas para no chocar con el `max-rows` de PostgREST— y corre `computeRatings`. Con un filtro de temporada el motor recorre solo los partidos de ese rango de fechas locales (zona del grupo), así el "Mejor jugador" de la temporada no arrastra el historial. Cientos de partidos se procesan en milisegundos; si algún día no alcanza, la caché de D-027 ya existe.

## D-024 · Registro de cambios legible y sin duplicados
`/g/[slug]/ajustes/auditoria` (solo admins, como la política de `audit_logs`) traduce cada fila a una frase en tercera persona con `src/domain/audit/describe.ts` ("Brito" + "cargó el resultado 3–2 del partido del Sáb 24/10"). El UPDATE de `matches` que acompaña a `result_recorded`/`result_corrected` se omite porque la fila de la RPC ya lo cuenta con más detalle. Muestra los últimos 100 cambios; si hace falta más historia se pagina después.

## D-023 · Importar la lista de WhatsApp sin crear nada hasta confirmar
El parser y el matching corren en el navegador contra el plantel (con alias). Lo seguro queda elegido; lo dudoso exige elegir un candidato, "Es nuevo" o "Ignorar"; lo nuevo, "Crear ficha" o "Ignorar". Las fichas nuevas y los alias se guardan recién al tocar "Crear partido" (`addPlayersFromImportAction`, idempotente: si el apodo ya existe reutiliza la ficha) y después se llama a `create_match`. Solo se recuerdan como alias las elecciones hechas a mano cuyo nombre no coincide ya con un apodo, nombre completo o alias.

## D-022 · Fechas de partido en la zona horaria del grupo
La base guarda `scheduled_at` como `timestamptz`; la UI pide fecha y hora locales y el servidor las convierte con `groups.timezone` (`zonedDateTimeToIso`, que respeta el horario de verano). Las pantallas formatean siempre con esa zona, nunca con la del navegador ni la del servidor. La hora actual ("Hoy", "Falta resultado") se lee después de `connection()`. Armado manual de equipos: el nivel es `base_rating` hasta que el motor de valoración lo reemplace, y "Mezclar por nivel" es un reparto en serpiente determinista; "Generar parejos" queda reservado al optimizador.

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
