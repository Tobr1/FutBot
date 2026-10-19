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

/** Crea un partido finalizado con los equipos y el marcador indicados. */
async function finishedMatch(g: GroupFixture, teamA: string[], teamB: string[], scoreA: number, scoreB: number) {
  const [row] = await t.rpc<{ create_match: string }>(g.adminId, "create_match", {
    p_group_id: g.groupId,
    p_scheduled_at: new Date().toISOString(),
    p_players_per_team: teamA.length,
    p_participants: [...teamA, ...teamB].map((player_id) => ({ player_id })),
  });
  await t.rpc(g.adminId, "set_match_teams", { p_match_id: row.create_match, p_team_a: teamA, p_team_b: teamB });
  await t.rpc(g.adminId, "record_match_result", {
    p_match_id: row.create_match,
    p_score_a: scoreA,
    p_score_b: scoreB,
  });
  return row.create_match;
}

function insertConstraint(userId: string, groupId: string, a: string, b: string, kind = "together", note: string | null = null) {
  return t.queryAs<{ id: string }>(
    userId,
    "insert into public.team_constraints (group_id, player_a, player_b, kind, note) values ($1, $2, $3, $4, $5) returning id",
    [groupId, a, b, kind, note],
  );
}

describe("restricciones de armado", () => {
  let g: GroupFixture;
  let member: { userId: string; playerId: string };
  let p1: string;
  let p2: string;
  let p3: string;
  let constraintId: string;

  beforeAll(async () => {
    g = await createGroupWithAdmin(t);
    member = await addMemberWithPlayer(t, g, "Manu");
    p1 = await addPlayer(t, g, "Vece");
    p2 = await addPlayer(t, g, "Paramo");
    p3 = await addPlayer(t, g, "Tadeo");
  });

  it("un admin crea una restricción y queda auditada", async () => {
    const [row] = await insertConstraint(g.adminId, g.groupId, p1, p2, "apart", "Se pelean siempre");
    constraintId = row.id;
    const [stored] = await t.sql<{ created_by: string; kind: string }>(
      "select created_by, kind from public.team_constraints where id = $1",
      [constraintId],
    );
    expect(stored).toEqual({ created_by: g.adminId, kind: "apart" });
    const audit = await t.sql(
      "select 1 from public.audit_logs where entity_type = 'team_constraints' and entity_id = $1 and action = 'insert'",
      [constraintId],
    );
    expect(audit).toHaveLength(1);
  });

  it("los miembros las leen", async () => {
    const rows = await t.queryAs<{ id: string }>(member.userId, "select id from public.team_constraints where group_id = $1", [
      g.groupId,
    ]);
    expect(rows.map((r) => r.id)).toEqual([constraintId]);
  });

  it("quien no es miembro no las ve", async () => {
    const outsider = await t.createUser("Ajeno");
    const rows = await t.queryAs(outsider, "select id from public.team_constraints where group_id = $1", [g.groupId]);
    expect(rows).toHaveLength(0);
  });

  it("un jugador no puede crearlas", async () => {
    await expectDbError(insertConstraint(member.userId, g.groupId, p1, p3), "row-level security");
  });

  it("el par invertido cuenta como duplicado (aunque cambie el tipo)", async () => {
    await expectDbError(insertConstraint(g.adminId, g.groupId, p2, p1, "together"), "team_constraints_pair_key");
  });

  it("no se puede vincular a un jugador consigo mismo", async () => {
    await expectDbError(insertConstraint(g.adminId, g.groupId, p3, p3), "team_constraints_distinct_players");
  });

  it("no se mezclan jugadores de otro grupo", async () => {
    const other = await createGroupWithAdmin(t, "Los del Martes");
    await expectDbError(insertConstraint(g.adminId, g.groupId, p1, other.adminPlayerId), "team_constraints_player_b_fkey");
  });

  it("la nota tiene como máximo 120 caracteres", async () => {
    await expectDbError(insertConstraint(g.adminId, g.groupId, p1, p3, "together", "x".repeat(121)), "check constraint");
  });

  it("no se editan: no hay privilegio de update", async () => {
    await expectDbError(
      t.queryAs(g.adminId, "update public.team_constraints set kind = 'together' where id = $1", [constraintId]),
      "permission denied",
    );
  });

  it("un jugador no puede borrarlas; un admin sí", async () => {
    const none = await t.queryAs(member.userId, "delete from public.team_constraints where id = $1 returning id", [constraintId]);
    expect(none).toHaveLength(0);
    const deleted = await t.queryAs(g.adminId, "delete from public.team_constraints where id = $1 returning id", [constraintId]);
    expect(deleted).toHaveLength(1);
  });

  it("se borran en cascada con la ficha", async () => {
    const [row] = await insertConstraint(g.adminId, g.groupId, p2, p3);
    await t.queryAs(g.adminId, "delete from public.players where id = $1", [p3]);
    const rows = await t.sql("select 1 from public.team_constraints where id = $1", [row.id]);
    expect(rows).toHaveLength(0);
  });
});

describe("caché del motor (replace_skill_history)", () => {
  let g: GroupFixture;
  let other: GroupFixture;
  let member: { userId: string; playerId: string };
  let players: string[];
  let matchId: string;
  let otherMatchId: string;

  beforeAll(async () => {
    g = await createGroupWithAdmin(t);
    member = await addMemberWithPlayer(t, g, "Manu");
    players = [g.adminPlayerId, member.playerId];
    for (const name of ["Vece", "Paramo", "Tadeo", "Fran"]) players.push(await addPlayer(t, g, name));
    matchId = await finishedMatch(g, players.slice(0, 3), players.slice(3), 2, 1);

    other = await createGroupWithAdmin(t, "Otro grupo");
    const otherPlayers = [other.adminPlayerId];
    for (const name of ["A", "B", "C", "D", "E"]) otherPlayers.push(await addPlayer(t, other, name));
    otherMatchId = await finishedMatch(other, otherPlayers.slice(0, 3), otherPlayers.slice(3), 0, 0);
  });

  const rowsFor = (ids: string[], match: string) =>
    ids.map((player_id, i) => ({
      player_id,
      match_id: match,
      skill: 5 + i * 0.5,
      confidence: 0.221,
      performance: i % 2 === 0 ? 6.5 : null,
    }));

  function replace(userId: string, rows: unknown, version = "v1", groupId = g.groupId) {
    return t.rpc<{ replace_skill_history: number }>(userId, "replace_skill_history", {
      p_group_id: groupId,
      p_engine_version: version,
      p_rows: rows,
    });
  }

  it("cualquier miembro puede reemplazarla y todos la leen", async () => {
    const [row] = await replace(member.userId, rowsFor(players, matchId));
    expect(row.replace_skill_history).toBe(6);
    const stored = await t.queryAs<{ player_id: string; skill: string; confidence: string; performance: string | null }>(
      g.adminId,
      "select player_id, skill, confidence, performance from public.player_skill_history where group_id = $1 and engine_version = 'v1' order by skill",
      [g.groupId],
    );
    expect(stored).toHaveLength(6);
    expect(stored[0]).toEqual({ player_id: players[0], skill: "5.00", confidence: "0.221", performance: "6.50" });
    expect(stored[1].performance).toBeNull();
  });

  it("es idempotente y reemplaza todo el conjunto de esa versión", async () => {
    await replace(member.userId, rowsFor(players, matchId));
    await replace(member.userId, rowsFor(players, matchId));
    const [count] = await t.sql<{ n: number }>(
      "select count(*)::int as n from public.player_skill_history where group_id = $1 and engine_version = 'v1'",
      [g.groupId],
    );
    expect(count.n).toBe(6);

    await replace(member.userId, rowsFor(players.slice(0, 2), matchId));
    const [after] = await t.sql<{ n: number }>(
      "select count(*)::int as n from public.player_skill_history where group_id = $1 and engine_version = 'v1'",
      [g.groupId],
    );
    expect(after.n).toBe(2);
  });

  it("no toca otras versiones del motor", async () => {
    await replace(member.userId, rowsFor(players, matchId), "v2");
    await replace(member.userId, [], "v1");
    const rows = await t.sql<{ engine_version: string; n: number }>(
      "select engine_version, count(*)::int as n from public.player_skill_history where group_id = $1 group by 1",
      [g.groupId],
    );
    expect(rows).toEqual([{ engine_version: "v2", n: 6 }]);
  });

  it("quien no es miembro no puede refrescarla ni leerla", async () => {
    const outsider = await t.createUser("Ajeno");
    await expectDbError(replace(outsider, rowsFor(players, matchId)), "group_not_found");
    const rows = await t.queryAs(outsider, "select 1 from public.player_skill_history where group_id = $1", [g.groupId]);
    expect(rows).toHaveLength(0);
  });

  it("rechaza partidos y jugadores de otro grupo", async () => {
    await expectDbError(replace(member.userId, rowsFor(players.slice(0, 1), otherMatchId)), "match_not_found");
    await expectDbError(replace(member.userId, rowsFor([other.adminPlayerId], matchId)), "player_not_found");
  });

  it("rechaza valores fuera de rango o incompletos", async () => {
    const base = { player_id: players[0], match_id: matchId, skill: 5, confidence: 0.5 };
    await expectDbError(replace(member.userId, [{ ...base, skill: 10.5 }]), "invalid_skill_history");
    await expectDbError(replace(member.userId, [{ ...base, skill: 0.9 }]), "invalid_skill_history");
    await expectDbError(replace(member.userId, [{ ...base, confidence: 1.2 }]), "invalid_skill_history");
    await expectDbError(replace(member.userId, [{ ...base, confidence: -0.1 }]), "invalid_skill_history");
    await expectDbError(replace(member.userId, [{ ...base, performance: 11 }]), "invalid_skill_history");
    await expectDbError(replace(member.userId, [{ ...base, skill: null }]), "invalid_skill_history");
    await expectDbError(replace(member.userId, [{ ...base, player_id: "no-es-uuid" }]), "invalid_skill_history");
    await expectDbError(replace(member.userId, [base, base]), "invalid_skill_history");
    await expectDbError(replace(member.userId, [base], ""), "invalid_skill_history");
    await expectDbError(replace(member.userId, { rows: [base] }), "invalid_skill_history");
  });

  it("limita la cantidad de filas", async () => {
    const many = Array.from({ length: 5001 }, () => ({ player_id: players[0], match_id: matchId, skill: 5, confidence: 0.5 }));
    await expectDbError(replace(member.userId, many), "too_many_rows");
  });

  it("no se escribe directamente", async () => {
    await expectDbError(
      t.queryAs(
        g.adminId,
        `insert into public.player_skill_history (group_id, player_id, match_id, skill, confidence, engine_version)
         values ($1, $2, $3, 5, 0.5, 'v9')`,
        [g.groupId, players[0], matchId],
      ),
      "permission denied",
    );
    await expectDbError(
      t.queryAs(g.adminId, "delete from public.player_skill_history where group_id = $1", [g.groupId]),
      "permission denied",
    );
  });
});

describe("cara a cara (get_head_to_head)", () => {
  let g: GroupFixture;
  let a: string;
  let b: string;
  let rest: string[];

  beforeAll(async () => {
    g = await createGroupWithAdmin(t);
    a = g.adminPlayerId;
    b = await addPlayer(t, g, "Vece");
    rest = [];
    for (const name of ["Paramo", "Tadeo", "Fran", "Boni"]) rest.push(await addPlayer(t, g, name));

    // Juntos, ganan 2-1.
    await finishedMatch(g, [a, b, rest[0]], rest.slice(1), 2, 1);
    // Rivales, empatan 1-1.
    await finishedMatch(g, [a, rest[0], rest[1]], [b, rest[2], rest[3]], 1, 1);
    // Rivales, gana B 2-0.
    await finishedMatch(g, [a, rest[0], rest[1]], [b, rest[2], rest[3]], 0, 2);
    // Partido sin finalizar: no cuenta.
    await t.rpc(g.adminId, "create_match", {
      p_group_id: g.groupId,
      p_scheduled_at: new Date().toISOString(),
      p_players_per_team: 3,
      p_participants: [a, b].map((player_id) => ({ player_id })),
    });
  });

  it("cuenta partidos juntos y enfrentados desde el punto de vista de A", async () => {
    const [row] = await t.rpc(g.adminId, "get_head_to_head", { p_group_id: g.groupId, p_player_a: a, p_player_b: b });
    expect(row).toEqual({
      together_matches: 1,
      together_wins: 1,
      together_draws: 0,
      together_losses: 0,
      against_matches: 2,
      a_wins: 0,
      b_wins: 1,
      draws: 1,
    });
  });

  it("es simétrico al invertir los jugadores", async () => {
    const member = await addMember(t, g, "Manu");
    const [row] = await t.rpc(member, "get_head_to_head", { p_group_id: g.groupId, p_player_a: b, p_player_b: a });
    expect(row).toMatchObject({ together_matches: 1, against_matches: 2, a_wins: 1, b_wins: 0, draws: 1 });
  });

  it("devuelve ceros para quien no es miembro", async () => {
    const outsider = await t.createUser("Ajeno");
    const [row] = await t.rpc(outsider, "get_head_to_head", { p_group_id: g.groupId, p_player_a: a, p_player_b: b });
    expect(row).toMatchObject({ together_matches: 0, against_matches: 0 });
  });

  it("anon no puede ejecutarla", async () => {
    await expectDbError(
      t.rpc(null, "get_head_to_head", { p_group_id: g.groupId, p_player_a: a, p_player_b: b }),
      "permission denied",
    );
  });
});
