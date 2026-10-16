import type { TestDb } from "./test-db";

export interface GroupFixture {
  groupId: string;
  slug: string;
  adminId: string;
  adminPlayerId: string;
}

/** Crea un admin y su grupo (con ficha propia). */
export async function createGroupWithAdmin(t: TestDb, name = "Los del Sábado"): Promise<GroupFixture> {
  const adminId = await t.createUser("Brito");
  const [group] = await t.rpc<{ id: string; slug: string }>(adminId, "create_group", {
    p_name: name,
    p_player_nickname: "Brito",
  });
  const [player] = await t.sql<{ id: string }>(
    "select id from public.players where group_id = $1 and profile_id = $2",
    [group.id, adminId],
  );
  return { groupId: group.id, slug: group.slug, adminId, adminPlayerId: player.id };
}

/** Suma una cuenta al grupo por invitación y devuelve su id. */
export async function addMember(t: TestDb, g: GroupFixture, name: string, role: "admin" | "player" = "player") {
  const userId = await t.createUser(name);
  const [inv] = await t.queryAs<{ token: string }>(
    g.adminId,
    "insert into public.invitations (group_id, role) values ($1, $2) returning token",
    [g.groupId, role],
  );
  await t.rpc(userId, "accept_invitation", { p_token: inv.token });
  return userId;
}

/** Crea una ficha (sin cuenta) como admin. */
export async function addPlayer(t: TestDb, g: GroupFixture, nickname: string, baseRating = 5): Promise<string> {
  const [row] = await t.rpc<{ save_player: string }>(g.adminId, "save_player", {
    p_group_id: g.groupId,
    p_player_id: null,
    p_nickname: nickname,
    p_base_rating: baseRating,
  });
  return row.save_player;
}

/** Miembro con ficha propia creada por él mismo. */
export async function addMemberWithPlayer(t: TestDb, g: GroupFixture, name: string) {
  const userId = await addMember(t, g, name);
  const [row] = await t.rpc<{ create_own_player: string }>(userId, "create_own_player", {
    p_group_id: g.groupId,
    p_nickname: name,
  });
  return { userId, playerId: row.create_own_player };
}
