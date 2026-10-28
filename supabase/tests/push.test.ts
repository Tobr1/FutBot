import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { addMember, addMemberWithPlayer, addPlayer, createGroupWithAdmin, type GroupFixture } from "./helpers/fixtures";
import { createTestDb, expectDbError, type TestDb } from "./helpers/test-db";

let t: TestDb;

const KEY = "clave-de-despacho-de-prueba-0123456789abcdef";

beforeAll(async () => {
  t = await createTestDb();
  await t.sql("insert into private.push_dispatch_keys (key_hash) values (sha256(convert_to($1, 'UTF8')))", [KEY]);
});

afterAll(async () => {
  await t?.close();
});

let seq = 0;
async function subscribe(userId: string) {
  const endpoint = `https://push.example.com/send/${++seq}`;
  await t.rpc(userId, "save_push_subscription", { p_endpoint: endpoint, p_p256dh: "BPk3", p_auth: "aUt", p_user_agent: "test" });
  return endpoint;
}

const targets = (userId: string, event: string, ref: string, key = KEY) =>
  t.rpc<{ endpoint: string }>(userId, "get_push_targets", { p_key: key, p_event: event, p_ref: ref }).then((rows) =>
    rows.map((r) => r.endpoint).sort(),
  );

const IN_TWO_DAYS = () => new Date(Date.now() + 2 * 24 * 3600 * 1000).toISOString();

async function createMatch(g: GroupFixture, playerIds: string[]) {
  while (playerIds.length < 6) playerIds.push(await addPlayer(t, g, `Relleno ${playerIds.length}`));
  const [row] = await t.rpc<{ create_match: string }>(g.adminId, "create_match", {
    p_group_id: g.groupId,
    p_scheduled_at: IN_TWO_DAYS(),
    p_players_per_team: 3,
    p_participants: playerIds.map((player_id) => ({ player_id })),
  });
  return row.create_match;
}

describe("suscripciones", () => {
  it("cada uno ve solo las suyas; si el dispositivo cambia de cuenta, pasa a la nueva", async () => {
    const g = await createGroupWithAdmin(t);
    const ana = await addMember(t, g, "Ana");
    const endpoint = await subscribe(ana);
    expect(await t.queryAs(ana, "select endpoint from public.push_subscriptions")).toEqual([{ endpoint }]);
    expect(await t.queryAs(g.adminId, "select endpoint from public.push_subscriptions")).toEqual([]);

    await t.rpc(g.adminId, "save_push_subscription", { p_endpoint: endpoint, p_p256dh: "x", p_auth: "y" });
    expect(await t.queryAs(ana, "select endpoint from public.push_subscriptions")).toEqual([]);
    expect(await t.queryAs(g.adminId, "select endpoint from public.push_subscriptions")).toEqual([{ endpoint }]);

    await t.rpc(ana, "delete_push_subscription", { p_endpoint: endpoint });
    expect(await t.queryAs(g.adminId, "select endpoint from public.push_subscriptions")).toHaveLength(1);
    await t.rpc(g.adminId, "delete_push_subscription", { p_endpoint: endpoint });
    expect(await t.queryAs(g.adminId, "select endpoint from public.push_subscriptions")).toHaveLength(0);
  });

  it("rechaza endpoints que no son https y no se escribe directo en la tabla", async () => {
    const g = await createGroupWithAdmin(t);
    await expectDbError(
      t.rpc(g.adminId, "save_push_subscription", { p_endpoint: "http://inseguro", p_p256dh: "x", p_auth: "y" }),
      "invalid_subscription",
    );
    await expectDbError(
      t.queryAs(g.adminId, "insert into public.push_subscriptions (endpoint, profile_id, p256dh, auth) values ('https://a', $1, 'x', 'y')", [
        g.adminId,
      ]),
      "permission denied",
    );
  });
});

describe("destinatarios de un aviso", () => {
  it("partido nuevo: a los demás miembros, una sola vez, y respeta las preferencias", async () => {
    const g = await createGroupWithAdmin(t);
    const ana = await addMember(t, g, "Ana");
    const beto = await addMember(t, g, "Beto");
    const anaEndpoint = await subscribe(ana);
    await subscribe(beto);
    await subscribe(g.adminId);
    await t.rpc(beto, "set_notification_preference", { p_event: "match_created", p_enabled: false });

    const ids = [g.adminPlayerId, await addPlayer(t, g, "Manu")];
    const matchId = await createMatch(g, ids);
    expect(await targets(g.adminId, "match_created", matchId)).toEqual([anaEndpoint]);
    expect(await targets(g.adminId, "match_created", matchId)).toEqual([]);
  });

  it("sin la clave de despacho no devuelve nada, y un miembro común no puede avisar", async () => {
    const g = await createGroupWithAdmin(t);
    const ana = await addMember(t, g, "Ana");
    const matchId = await createMatch(g, [g.adminPlayerId, await addPlayer(t, g, "Manu")]);
    await expectDbError(targets(g.adminId, "match_created", matchId, "otra-clave-cualquiera-0123456789abcdef"), "forbidden");
    expect(await targets(ana, "match_created", matchId)).toEqual([]);
    expect(await targets(g.adminId, "match_created", matchId)).toEqual([]);
  });

  it("votación abierta: solo a los que jugaron y con la votación abierta", async () => {
    const g = await createGroupWithAdmin(t);
    const jugo = await addMemberWithPlayer(t, g, "Jugó");
    const noJugo = await addMemberWithPlayer(t, g, "Afuera");
    const jugoEndpoint = await subscribe(jugo.userId);
    await subscribe(noJugo.userId);
    const ids = [g.adminPlayerId, jugo.playerId];
    const matchId = await createMatch(g, ids);
    await t.rpc(g.adminId, "set_match_teams", { p_match_id: matchId, p_team_a: ids.slice(0, 3), p_team_b: ids.slice(3) });

    expect(await targets(g.adminId, "voting_open", matchId)).toEqual([]);
    await t.rpc(g.adminId, "record_match_result", { p_match_id: matchId, p_score_a: 0, p_score_b: 0, p_events: [] });
    expect(await targets(g.adminId, "voting_open", matchId)).toEqual([jugoEndpoint]);
    expect(await targets(g.adminId, "voting_open", matchId)).toEqual([]);
  });

  it("validar compañeros: solo el dueño de la ficha, después de autoevaluarse", async () => {
    const g = await createGroupWithAdmin(t);
    const fran = await addMemberWithPlayer(t, g, "Fran");
    const sinFicha = await addMember(t, g, "Sin ficha");
    const adminEndpoint = await subscribe(g.adminId);
    await subscribe(sinFicha);
    await subscribe(fran.userId);

    expect(await targets(fran.userId, "validation_request", fran.playerId)).toEqual([]);
    expect(await targets(g.adminId, "validation_request", fran.playerId)).toEqual([]);
    await t.rpc(fran.userId, "save_self_assessment", { p_group_id: g.groupId, p_values: [70, 70, 70, 70, 70, 70] });
    expect(await targets(fran.userId, "validation_request", fran.playerId)).toEqual([adminEndpoint]);
    expect(await targets(fran.userId, "validation_request", fran.playerId)).toEqual([]);
  });

  it("solo con la clave se borran suscripciones dadas de baja", async () => {
    const g = await createGroupWithAdmin(t);
    const ana = await addMember(t, g, "Ana");
    const endpoint = await subscribe(ana);
    await expectDbError(
      t.rpc(g.adminId, "prune_push_subscriptions", { p_key: "x", p_endpoints: [endpoint] }),
      "forbidden",
    );
    await t.rpc(g.adminId, "prune_push_subscriptions", { p_key: KEY, p_endpoints: [endpoint] });
    expect(await t.queryAs(ana, "select endpoint from public.push_subscriptions")).toEqual([]);
  });
});
