import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMember, addMemberWithPlayer, addPlayer, createGroupWithAdmin, type GroupFixture } from "./helpers/fixtures";
import { createTestDb, expectDbError, type TestDb } from "./helpers/test-db";

let t: TestDb;

beforeAll(async () => {
  t = await createTestDb();
});

afterAll(async () => {
  await t?.close();
});

const IN_TWO_DAYS = () => new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();

type Entry = { player_id: string; status?: string } | { guest: string; status?: string };

async function createMatch(g: GroupFixture, participants: Entry[]) {
  const [row] = await t.rpc<{ create_match: string }>(g.adminId, "create_match", {
    p_group_id: g.groupId,
    p_scheduled_at: IN_TWO_DAYS(),
    p_players_per_team: 3,
    p_participants: participants,
  });
  return row.create_match;
}

const guestsOf = (groupId: string) =>
  t.sql<{ id: string; nickname: string; is_guest: boolean }>(
    "select id, nickname, is_guest from public.players where group_id = $1 and is_guest order by nickname",
    [groupId],
  );

const participantsOf = (matchId: string) =>
  t.sql<{ player_id: string; status: string; sort_order: number }>(
    "select player_id, status, sort_order from public.match_participants where match_id = $1 order by sort_order",
    [matchId],
  );

describe("invitados del partido", () => {
  it("se suman con el nombre, entran a la convocatoria y se reusan en el próximo partido", async () => {
    const g = await createGroupWithAdmin(t);
    const toto = await addPlayer(t, g, "Toto");
    const first = await createMatch(g, [{ player_id: toto }, { guest: "Primo de Juan" }, { guest: "Pepe", status: "reserve" }]);

    const guests = await guestsOf(g.groupId);
    expect(guests.map((p) => p.nickname)).toEqual(["Pepe", "Primo de Juan"]);
    const pepe = guests.find((p) => p.nickname === "Pepe")!.id;
    const primo = guests.find((p) => p.nickname === "Primo de Juan")!.id;
    expect(await participantsOf(first)).toEqual([
      { player_id: toto, status: "confirmed", sort_order: 0 },
      { player_id: primo, status: "confirmed", sort_order: 1 },
      { player_id: pepe, status: "reserve", sort_order: 2 },
    ]);

    // Mismo nombre con otra forma de escribirlo: es el mismo invitado.
    const second = await createMatch(g, [{ guest: "  pepé " }]);
    expect(await participantsOf(second)).toEqual([{ player_id: pepe, status: "confirmed", sort_order: 0 }]);
    expect(await guestsOf(g.groupId)).toHaveLength(2);
  });

  it("también desde la convocatoria de un partido ya creado, y solo el admin", async () => {
    const g = await createGroupWithAdmin(t);
    const ana = await addMember(t, g, "Ana");
    const matchId = await createMatch(g, [{ player_id: g.adminPlayerId }]);

    await expectDbError(
      t.rpc(ana, "set_match_participants", { p_match_id: matchId, p_participants: [{ guest: "Colado" }] }),
      "match_not_found",
    );
    expect(await guestsOf(g.groupId)).toEqual([]);

    await t.rpc(g.adminId, "set_match_participants", {
      p_match_id: matchId,
      p_participants: [{ player_id: g.adminPlayerId }, { guest: "Colado" }],
    });
    const [colado] = await guestsOf(g.groupId);
    expect(colado.nickname).toBe("Colado");
    expect((await participantsOf(matchId)).map((p) => p.player_id)).toEqual([g.adminPlayerId, colado.id]);
  });

  it("rechaza nombres del plantel, nombres vacíos y el mismo invitado dos veces", async () => {
    const g = await createGroupWithAdmin(t);
    await addPlayer(t, g, "Juanchi");
    await expectDbError(createMatch(g, [{ guest: "juanchi" }]), "guest_name_taken");
    await expectDbError(createMatch(g, [{ guest: "   " }]), "invalid_guest");
    await expectDbError(createMatch(g, [{ guest: "x".repeat(31) }]), "invalid_guest");
    await expectDbError(createMatch(g, [{ guest: "Lalo" }, { guest: "LALO" }]), "duplicate_participant");
    // Todo o nada: ninguno de los intentos dejó fichas ni partidos.
    expect(await guestsOf(g.groupId)).toEqual([]);
    expect(await t.sql("select 1 from public.matches where group_id = $1", [g.groupId])).toEqual([]);
  });

  it("pasar al plantel: lo hace el admin, y vincular una cuenta lo saca de invitado", async () => {
    const g = await createGroupWithAdmin(t);
    await createMatch(g, [{ guest: "Fede" }, { guest: "Nico" }]);
    const [fede, nico] = await guestsOf(g.groupId);
    const { userId: ana } = await addMemberWithPlayer(t, g, "Ana");

    await t.queryAs(ana, "update public.players set is_guest = false where id = $1", [fede.id]);
    expect((await guestsOf(g.groupId)).map((p) => p.nickname)).toEqual(["Fede", "Nico"]);

    await t.queryAs(g.adminId, "update public.players set is_guest = false where id = $1", [fede.id]);
    expect((await guestsOf(g.groupId)).map((p) => p.nickname)).toEqual(["Nico"]);

    const beto = await addMember(t, g, "Beto");
    await t.rpc(beto, "claim_player", { p_player_id: nico.id });
    expect(await guestsOf(g.groupId)).toEqual([]);

    // Una ficha con cuenta no puede quedar como invitada.
    await expectDbError(
      t.queryAs(g.adminId, "update public.players set is_guest = true where id = $1", [g.adminPlayerId]),
      "players_guest_unlinked",
    );
  });
});
