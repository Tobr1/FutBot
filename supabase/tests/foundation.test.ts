import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMember, addMemberWithPlayer, addPlayer, createGroupWithAdmin, type GroupFixture, makeAppAdmin } from "./helpers/fixtures";
import { createTestDb, expectDbError, type TestDb } from "./helpers/test-db";

let t: TestDb;

beforeAll(async () => {
  t = await createTestDb();
});

afterAll(async () => {
  await t?.close();
});

describe("perfiles", () => {
  it("se crean al registrarse con el nombre de los metadatos", async () => {
    const id = await t.createUser("Manu");
    const [profile] = await t.sql<{ display_name: string }>("select display_name from public.profiles where id = $1", [id]);
    expect(profile.display_name).toBe("Manu");
  });

  it("solo son visibles para uno mismo y compañeros de grupo", async () => {
    const g = await createGroupWithAdmin(t);
    const mate = await addMember(t, g, "Vece");
    const stranger = await t.createUser("Ajeno");

    const seenByMate = await t.queryAs(mate, "select id from public.profiles where id = $1", [g.adminId]);
    const seenByStranger = await t.queryAs(stranger, "select id from public.profiles where id = $1", [g.adminId]);
    expect(seenByMate).toHaveLength(1);
    expect(seenByStranger).toHaveLength(0);
  });

  it("cada uno edita solo su perfil", async () => {
    const a = await t.createUser("A");
    const b = await t.createUser("B");
    await t.queryAs(a, "update public.profiles set display_name = 'Nuevo' where id = $1", [b]);
    const [profile] = await t.sql<{ display_name: string }>("select display_name from public.profiles where id = $1", [b]);
    expect(profile.display_name).toBe("B");
  });
});

describe("grupos", () => {
  let g: GroupFixture;

  beforeAll(async () => {
    g = await createGroupWithAdmin(t, "Fútbol del Jueves");
  });

  it("create_group deja al creador como admin, con temporada y ficha", async () => {
    expect(g.slug).toMatch(/^futbol-del-jueves-[a-z0-9]{5}$/);
    const [member] = await t.sql<{ role: string }>(
      "select role from public.group_members where group_id = $1 and profile_id = $2",
      [g.groupId, g.adminId],
    );
    expect(member.role).toBe("admin");
    const seasons = await t.sql("select * from public.seasons where group_id = $1 and ends_on is null", [g.groupId]);
    expect(seasons).toHaveLength(1);
    expect(g.adminPlayerId).toBeTruthy();
  });

  it("un no miembro no ve el grupo ni sus datos", async () => {
    const stranger = await t.createUser("Curioso");
    expect(await t.queryAs(stranger, "select * from public.groups where id = $1", [g.groupId])).toHaveLength(0);
    expect(await t.queryAs(stranger, "select * from public.players where group_id = $1", [g.groupId])).toHaveLength(0);
    expect(await t.queryAs(stranger, "select * from public.group_members where group_id = $1", [g.groupId])).toHaveLength(0);
  });

  it("un anónimo no puede leer tablas", async () => {
    await expectDbError(t.queryAs(null, "select * from public.groups"), "permission denied");
  });

  it("un jugador ve el grupo pero no puede editarlo", async () => {
    const member = await addMember(t, g, "Paramo");
    expect(await t.queryAs(member, "select * from public.groups where id = $1", [g.groupId])).toHaveLength(1);
    const updated = await t.queryAs(member, "update public.groups set name = 'Hackeado' where id = $1 returning id", [g.groupId]);
    expect(updated).toHaveLength(0);
  });

  it("el admin edita los datos del grupo pero no el slug", async () => {
    const updated = await t.queryAs(g.adminId, "update public.groups set voting_window_hours = 24 where id = $1 returning id", [g.groupId]);
    expect(updated).toHaveLength(1);
    await expectDbError(
      t.queryAs(g.adminId, "update public.groups set slug = 'otro-slug' where id = $1", [g.groupId]),
      "permission denied",
    );
  });

  it("no se puede insertar un grupo directamente", async () => {
    const user = await t.createUser("Directo");
    await expectDbError(
      t.queryAs(user, "insert into public.groups (name, slug) values ('X', 'x-directo')"),
      "permission denied",
    );
  });

  it("rechaza zonas horarias inválidas", async () => {
    await expectDbError(
      t.queryAs(g.adminId, "update public.groups set timezone = 'Marte/Olympus' where id = $1", [g.groupId]),
      "invalid_timezone",
    );
  });
});

describe("miembros y roles", () => {
  it("el último admin no puede irse ni degradarse", async () => {
    const g = await createGroupWithAdmin(t);
    await expectDbError(
      t.queryAs(g.adminId, "delete from public.group_members where group_id = $1 and profile_id = $2", [g.groupId, g.adminId]),
      "last_admin",
    );
    await expectDbError(
      t.queryAs(g.adminId, "update public.group_members set role = 'player' where group_id = $1 and profile_id = $2", [
        g.groupId,
        g.adminId,
      ]),
      "last_admin",
    );
  });

  it("con otro admin, sí puede irse", async () => {
    const g = await createGroupWithAdmin(t);
    const second = await addMember(t, g, "Segundo");
    await makeAppAdmin(t, second);
    await t.queryAs(g.adminId, "update public.group_members set role = 'admin' where group_id = $1 and profile_id = $2", [
      g.groupId,
      second,
    ]);
    const deleted = await t.queryAs(
      g.adminId,
      "delete from public.group_members where group_id = $1 and profile_id = $2 returning profile_id",
      [g.groupId, g.adminId],
    );
    expect(deleted).toHaveLength(1);
  });

  it("un jugador no puede cambiar roles ni echar a otros, pero sí irse", async () => {
    const g = await createGroupWithAdmin(t);
    const a = await addMember(t, g, "A");
    const b = await addMember(t, g, "B");
    expect(
      await t.queryAs(a, "update public.group_members set role = 'admin' where group_id = $1 and profile_id = $2 returning 1", [
        g.groupId,
        a,
      ]),
    ).toHaveLength(0);
    expect(
      await t.queryAs(a, "delete from public.group_members where group_id = $1 and profile_id = $2 returning 1", [g.groupId, b]),
    ).toHaveLength(0);
    expect(
      await t.queryAs(a, "delete from public.group_members where group_id = $1 and profile_id = $2 returning 1", [g.groupId, a]),
    ).toHaveLength(1);
  });

  it("al salir del grupo la ficha queda pero se desvincula", async () => {
    const g = await createGroupWithAdmin(t);
    const { userId, playerId } = await addMemberWithPlayer(t, g, "Tadeo");
    await t.queryAs(userId, "delete from public.group_members where group_id = $1 and profile_id = $2", [g.groupId, userId]);
    const [player] = await t.sql<{ profile_id: string | null }>("select profile_id from public.players where id = $1", [playerId]);
    expect(player.profile_id).toBeNull();
  });

  it("si se elimina la cuenta del único admin, se promueve al miembro más antiguo", async () => {
    const g = await createGroupWithAdmin(t);
    const veteran = await addMember(t, g, "Veterano");
    await addMember(t, g, "Nuevo");
    await t.sql("delete from auth.users where id = $1", [g.adminId]);
    const [member] = await t.sql<{ role: string }>(
      "select role from public.group_members where group_id = $1 and profile_id = $2",
      [g.groupId, veteran],
    );
    expect(member.role).toBe("admin");
  });
});

describe("jugadores", () => {
  let g: GroupFixture;

  beforeAll(async () => {
    g = await createGroupWithAdmin(t);
  });

  it("el admin crea fichas con posiciones", async () => {
    const [row] = await t.rpc<{ save_player: string }>(g.adminId, "save_player", {
      p_group_id: g.groupId,
      p_player_id: null,
      p_nickname: "Juanchi",
      p_full_name: "Juan Cruz",
      p_base_rating: 7.5,
      p_primary_position: "forward",
      p_secondary_position: "midfielder",
    });
    const positions = await t.sql<{ position: string; priority: number }>(
      "select position, priority from public.player_positions where player_id = $1 order by priority",
      [row.save_player],
    );
    expect(positions).toEqual([
      { position: "forward", priority: 1 },
      { position: "midfielder", priority: 2 },
    ]);
  });

  it("no permite apodos duplicados aunque cambien mayúsculas, acentos o espacios", async () => {
    await expectDbError(addPlayer(t, g, "  JUÁNCHI "), "players_group_nickname_key");
  });

  it("rechaza posición principal y secundaria iguales", async () => {
    await expectDbError(
      t.rpc(g.adminId, "save_player", {
        p_group_id: g.groupId,
        p_player_id: null,
        p_nickname: "Doble",
        p_primary_position: "defender",
        p_secondary_position: "defender",
      }),
      "positions_must_differ",
    );
  });

  it("un jugador no puede crear fichas", async () => {
    const member = await addMember(t, g, "SinPermiso");
    await expectDbError(
      t.rpc(member, "save_player", { p_group_id: g.groupId, p_player_id: null, p_nickname: "Trucho" }),
      "row-level security",
    );
  });

  it("un jugador no edita su propia ficha ni sus posiciones (solo ve y vota)", async () => {
    const { userId, playerId } = await addMemberWithPlayer(t, g, "Fran");
    const updated = await t.queryAs(userId, "update public.players set full_name = 'Francisco' where id = $1 returning id", [playerId]);
    expect(updated).toHaveLength(0);
    await expectDbError(
      t.queryAs(userId, "insert into public.player_positions (player_id, group_id, position, priority) values ($1, $2, 'forward', 1)", [
        playerId,
        g.groupId,
      ]),
      "row-level security",
    );
  });

  it("un jugador no puede editar la ficha de otro", async () => {
    const { userId } = await addMemberWithPlayer(t, g, "Boni");
    const other = await addPlayer(t, g, "Matías");
    const updated = await t.queryAs(userId, "update public.players set full_name = 'X' where id = $1 returning id", [other]);
    expect(updated).toHaveLength(0);
  });

  it("no se puede vincular una ficha a alguien que no es miembro", async () => {
    const stranger = await t.createUser("Extraño");
    const playerId = await addPlayer(t, g, "Gero");
    await expectDbError(
      t.queryAs(g.adminId, "update public.players set profile_id = $1 where id = $2", [stranger, playerId]),
      "players_member_fkey",
    );
  });

  it("claim_player vincula una ficha libre una sola vez", async () => {
    const playerId = await addPlayer(t, g, "Lucas");
    const user = await addMember(t, g, "Lucas");
    await t.rpc(user, "claim_player", { p_player_id: playerId });
    const [player] = await t.sql<{ profile_id: string }>("select profile_id from public.players where id = $1", [playerId]);
    expect(player.profile_id).toBe(user);

    const other = await addMember(t, g, "Impostor");
    await expectDbError(t.rpc(other, "claim_player", { p_player_id: playerId }), "player_already_claimed");

    const another = await addPlayer(t, g, "Nacho");
    await expectDbError(t.rpc(user, "claim_player", { p_player_id: another }), "already_has_player");
  });

  it("un no miembro no puede reclamar fichas", async () => {
    const playerId = await addPlayer(t, g, "Libre");
    const stranger = await t.createUser("Fuera");
    await expectDbError(t.rpc(stranger, "claim_player", { p_player_id: playerId }), "player_not_found");
  });
});

describe("invitaciones", () => {
  let g: GroupFixture;

  beforeAll(async () => {
    g = await createGroupWithAdmin(t);
  });

  async function invite(values: Record<string, unknown> = {}) {
    const columns = ["group_id", ...Object.keys(values)];
    const params = [g.groupId, ...Object.values(values)];
    const [row] = await t.queryAs<{ id: string; token: string }>(
      g.adminId,
      `insert into public.invitations (${columns.join(", ")}) values (${columns.map((_, i) => `$${i + 1}`).join(", ")}) returning id, token`,
      params,
    );
    return row;
  }

  it("generan un token de 64 caracteres", async () => {
    const { token } = await invite();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("los jugadores no ven las invitaciones", async () => {
    await invite();
    const member = await addMember(t, g, "Mirón");
    expect(await t.queryAs(member, "select * from public.invitations where group_id = $1", [g.groupId])).toHaveLength(0);
  });

  it("la vista previa funciona sin sesión", async () => {
    const { token } = await invite();
    const [preview] = await t.rpc<{ group_name: string; status: string; inviter_name: string }>(null, "get_invitation_preview", {
      p_token: token,
    });
    expect(preview.group_name).toBe("Los del Sábado");
    expect(preview.status).toBe("valid");
    expect(preview.inviter_name).toBe("Brito");
  });

  it("un token inexistente no devuelve nada", async () => {
    const rows = await t.rpc(null, "get_invitation_preview", { p_token: "0".repeat(64) });
    expect(rows).toHaveLength(0);
  });

  it("no se pueden crear invitaciones de admin", async () => {
    await expectDbError(invite({ role: "admin" }), "admin_reserved");
  });

  it("aceptar suma al grupo como jugador", async () => {
    const { token } = await invite();
    const user = await t.createUser("Nuevo");
    const [result] = await t.rpc<{ group_slug: string; needs_player: boolean }>(user, "accept_invitation", { p_token: token });
    expect(result.group_slug).toBe(g.slug);
    expect(result.needs_player).toBe(true);
    const [member] = await t.sql<{ role: string }>(
      "select role from public.group_members where group_id = $1 and profile_id = $2",
      [g.groupId, user],
    );
    expect(member.role).toBe("player");
  });

  it("respeta max_uses", async () => {
    const { token } = await invite({ max_uses: 1 });
    await t.rpc(await t.createUser(), "accept_invitation", { p_token: token });
    await expectDbError(t.rpc(await t.createUser(), "accept_invitation", { p_token: token }), "invitation_exhausted");
  });

  it("rechaza invitaciones vencidas o revocadas", async () => {
    const expired = await invite({ expires_at: new Date(Date.now() - 60_000).toISOString() });
    await expectDbError(t.rpc(await t.createUser(), "accept_invitation", { p_token: expired.token }), "invitation_expired");

    const revoked = await invite();
    await t.queryAs(g.adminId, "update public.invitations set revoked_at = now() where id = $1", [revoked.id]);
    await expectDbError(t.rpc(await t.createUser(), "accept_invitation", { p_token: revoked.token }), "invitation_revoked");
  });

  it("una invitación ligada a una ficha la vincula al aceptar", async () => {
    const playerId = await addPlayer(t, g, "Vece");
    const { token } = await invite({ player_id: playerId, max_uses: 1 });
    const user = await t.createUser("Vece");
    const [result] = await t.rpc<{ player_id: string; needs_player: boolean }>(user, "accept_invitation", { p_token: token });
    expect(result.player_id).toBe(playerId);
    expect(result.needs_player).toBe(false);
  });

  it("una invitación ligada a una ficha exige un solo uso", async () => {
    const playerId = await addPlayer(t, g, "Único");
    await expectDbError(invite({ player_id: playerId }), "invitations_player_single_use");
  });

  it("un miembro que vuelve a abrir el link no consume usos", async () => {
    const { id, token } = await invite({ max_uses: 5 });
    const user = await t.createUser();
    await t.rpc(user, "accept_invitation", { p_token: token });
    await t.rpc(user, "accept_invitation", { p_token: token });
    const [row] = await t.sql<{ use_count: number }>("select use_count from public.invitations where id = $1", [id]);
    expect(row.use_count).toBe(1);
  });
});

describe("temporadas", () => {
  it("no se solapan dentro de un grupo", async () => {
    const g = await createGroupWithAdmin(t);
    await expectDbError(
      t.queryAs(g.adminId, "insert into public.seasons (group_id, name, starts_on) values ($1, 'Otra', current_date)", [g.groupId]),
      "season_overlap",
    );
  });

  it("start_new_season cierra la abierta y abre otra en una transacción", async () => {
    const g = await createGroupWithAdmin(t);
    const [{ start }] = await t.sql<{ start: string }>("select (current_date + 30)::text as start");
    await t.rpc(g.adminId, "start_new_season", { p_group_id: g.groupId, p_name: "Apertura", p_starts_on: start });
    const seasons = await t.sql<{ name: string; ends_on: string | null }>(
      "select name, ends_on::text from public.seasons where group_id = $1 order by starts_on",
      [g.groupId],
    );
    expect(seasons).toHaveLength(2);
    expect(seasons[1]).toEqual({ name: "Apertura", ends_on: null });
    expect(seasons[0].ends_on).not.toBeNull();

    const member = await addMember(t, g, "Jugador");
    await expectDbError(
      t.rpc(member, "start_new_season", { p_group_id: g.groupId, p_name: "Trucha", p_starts_on: start }),
      "forbidden",
    );
  });

  it("se puede cerrar una y abrir la siguiente", async () => {
    const g = await createGroupWithAdmin(t);
    await t.queryAs(g.adminId, "update public.seasons set ends_on = current_date where group_id = $1", [g.groupId]);
    const inserted = await t.queryAs(
      g.adminId,
      "insert into public.seasons (group_id, name, starts_on) values ($1, 'Siguiente', current_date + 1) returning id",
      [g.groupId],
    );
    expect(inserted).toHaveLength(1);
  });
});

describe("auditoría", () => {
  it("registra cambios de jugadores y solo la leen los admins", async () => {
    const g = await createGroupWithAdmin(t);
    const playerId = await addPlayer(t, g, "Auditado");
    const member = await addMember(t, g, "Mirón");

    const logs = await t.queryAs<{ action: string; actor_id: string }>(
      g.adminId,
      "select action, actor_id from public.audit_logs where group_id = $1 and entity_id = $2",
      [g.groupId, playerId],
    );
    expect(logs).toEqual([{ action: "insert", actor_id: g.adminId }]);
    expect(await t.queryAs(member, "select * from public.audit_logs where group_id = $1", [g.groupId])).toHaveLength(0);
  });

  it("no expone tokens de invitación", async () => {
    const g = await createGroupWithAdmin(t);
    await t.queryAs(g.adminId, "insert into public.invitations (group_id) values ($1)", [g.groupId]);
    const [log] = await t.sql<{ new_data: Record<string, unknown> }>(
      "select new_data from public.audit_logs where group_id = $1 and entity_type = 'invitations'",
      [g.groupId],
    );
    expect(log.new_data).not.toHaveProperty("token");
  });
});

describe("integridad", () => {
  it("borrar un grupo elimina todo en cascada", async () => {
    const g = await createGroupWithAdmin(t);
    await addMemberWithPlayer(t, g, "Cascada");
    await addPlayer(t, g, "Sin cuenta");
    await t.sql("delete from public.groups where id = $1", [g.groupId]);
    const [{ count }] = await t.sql<{ count: number }>(
      "select count(*)::int as count from public.players where group_id = $1",
      [g.groupId],
    );
    expect(count).toBe(0);
  });

  it("normalize_name ignora mayúsculas, acentos, signos y espacios", async () => {
    const [row] = await t.sql<{ a: string; b: string; c: string | null }>(
      "select public.normalize_name('  Juán  Cruz. ') as a, public.normalize_name('ÑOÑO_10') as b, public.normalize_name('⚽') as c",
    );
    expect(row).toEqual({ a: "juan cruz", b: "nono 10", c: null });
  });
});

describe("administrador único de la app", () => {
  it("solo el admin de la app crea grupos", async () => {
    const user = await t.createUser("Cualquiera");
    await expectDbError(t.rpc(user, "create_group", { p_name: "Mi grupo" }), "forbidden");
  });

  it("is_app_admin dice quién administra y app_admins no se puede escribir", async () => {
    const g = await createGroupWithAdmin(t);
    const member = await addMember(t, g, "Socio");
    const [admin] = await t.rpc<{ is_app_admin: boolean }>(g.adminId, "is_app_admin", {});
    const [other] = await t.rpc<{ is_app_admin: boolean }>(member, "is_app_admin", {});
    expect(admin.is_app_admin).toBe(true);
    expect(other.is_app_admin).toBe(false);
    await expectDbError(t.queryAs(member, "insert into public.app_admins (profile_id) values ($1)", [member]), "permission denied");
    expect(await t.queryAs(member, "select * from public.app_admins")).toHaveLength(0);
  });

  it("nadie más puede volverse admin de un grupo", async () => {
    const g = await createGroupWithAdmin(t);
    const member = await addMember(t, g, "Ascendido");
    await expectDbError(
      t.queryAs(g.adminId, "update public.group_members set role = 'admin' where group_id = $1 and profile_id = $2", [g.groupId, member]),
      "admin_reserved",
    );
  });

  it("un rol admin heredado sin ser admin de la app no da permisos", async () => {
    const g = await createGroupWithAdmin(t);
    const legacy = await addMember(t, g, "Viejo admin");
    // Simula un admin de antes de esta regla (escritura directa, sin triggers de la app).
    await t.sql("alter table public.group_members disable trigger group_members_admin_reserved");
    await t.sql("update public.group_members set role = 'admin' where group_id = $1 and profile_id = $2", [g.groupId, legacy]);
    await t.sql("alter table public.group_members enable trigger group_members_admin_reserved");
    expect(await t.queryAs(legacy, "select * from public.invitations where group_id = $1", [g.groupId])).toHaveLength(0);
    const renamed = await t.queryAs(legacy, "update public.groups set name = 'Hackeado' where id = $1 returning id", [g.groupId]);
    expect(renamed).toHaveLength(0);
  });
});
