import { describe, expect, it } from "vitest";
import { type AuditContext, type AuditRow, describeAudit } from "./describe";

const ctx: AuditContext = {
  formatDay: (iso) => `día ${iso.slice(0, 10)}`,
  matchScheduledAt: (id) => (id === "m1" ? "2026-10-25T01:00:00Z" : null),
  profileName: (id) => ({ u1: "Brito", u2: "Manu" })[id] ?? null,
};

const row = (partial: Partial<AuditRow>): AuditRow => ({
  action: "update",
  entityType: "matches",
  entityId: "m1",
  actorId: "u1",
  oldData: null,
  newData: null,
  ...partial,
});

describe("describeAudit · resultados", () => {
  it("describe la carga del resultado", () => {
    const d = describeAudit(row({ action: "result_recorded", newData: { score_a: 3, score_b: 2 } }), ctx);
    expect(d).toEqual({ text: "cargó el resultado 3–2 del partido del día 2026-10-25", category: "result" });
  });

  it("describe una corrección del marcador", () => {
    const d = describeAudit(
      row({ action: "result_corrected", oldData: { score_a: 3, score_b: 2 }, newData: { score_a: 4, score_b: 2 } }),
      ctx,
    );
    expect(d?.text).toBe("corrigió el resultado del partido del día 2026-10-25: 3–2 → 4–2");
  });

  it("describe una corrección sin cambio de marcador", () => {
    const d = describeAudit(
      row({ action: "result_corrected", oldData: { score_a: 1, score_b: 0 }, newData: { score_a: 1, score_b: 0 } }),
      ctx,
    );
    expect(d?.text).toContain("corrigió goles");
  });

  it("menciona partidos borrados", () => {
    const d = describeAudit(row({ action: "teams_corrected", entityId: "gone" }), ctx);
    expect(d?.text).toBe("corrigió los equipos de un partido eliminado");
  });
});

describe("describeAudit · partidos", () => {
  it("creación y borrado", () => {
    expect(describeAudit(row({ action: "insert", newData: { scheduled_at: "2026-10-20T23:00:00Z" } }), ctx)?.text).toBe(
      "creó el partido del día 2026-10-20",
    );
    expect(describeAudit(row({ action: "delete", oldData: { scheduled_at: "2026-10-20T23:00:00Z" } }), ctx)?.text).toBe(
      "eliminó el partido del día 2026-10-20",
    );
  });

  it("cambios de estado", () => {
    const base = { scheduled_at: "2026-10-20T23:00:00Z" };
    const status = (from: string, to: string) =>
      describeAudit(row({ oldData: { ...base, status: from }, newData: { ...base, status: to } }), ctx)?.text;
    expect(status("scheduled", "cancelled")).toBe("canceló el partido del día 2026-10-20");
    expect(status("scheduled", "in_progress")).toBe("marcó en curso el partido del día 2026-10-20");
    expect(status("cancelled", "scheduled")).toBe("reactivó el partido del día 2026-10-20");
  });

  it("omite el UPDATE que acompaña a la carga del resultado", () => {
    const d = describeAudit(
      row({ oldData: { status: "scheduled", scheduled_at: "x" }, newData: { status: "finished", scheduled_at: "x" } }),
      ctx,
    );
    expect(d).toBeNull();
  });

  it("describe cambios de fecha y de datos", () => {
    const moved = describeAudit(
      row({
        oldData: { status: "scheduled", scheduled_at: "2026-10-20T23:00:00Z" },
        newData: { status: "scheduled", scheduled_at: "2026-10-21T23:00:00Z" },
      }),
      ctx,
    );
    expect(moved?.text).toBe("cambió la fecha de un partido: día 2026-10-20 → día 2026-10-21");

    const venue = describeAudit(
      row({
        oldData: { status: "scheduled", scheduled_at: "2026-10-20T23:00:00Z", venue: "A" },
        newData: { status: "scheduled", scheduled_at: "2026-10-20T23:00:00Z", venue: "B" },
      }),
      ctx,
    );
    expect(venue?.text).toBe("editó los datos del partido del día 2026-10-20");
  });
});

describe("describeAudit · plantel y grupo", () => {
  const player = (partial: Partial<AuditRow>) => describeAudit(row({ entityType: "players", ...partial }), ctx)?.text;

  it("jugadores", () => {
    expect(player({ action: "insert", newData: { nickname: "Vece" } })).toBe("agregó a Vece al plantel");
    expect(player({ action: "delete", oldData: { nickname: "Vece" } })).toBe("eliminó la ficha de Vece");
    expect(player({ oldData: { nickname: "Vece", is_active: true }, newData: { nickname: "Vece", is_active: false } })).toBe(
      "desactivó a Vece",
    );
    expect(player({ oldData: { nickname: "Vece" }, newData: { nickname: "Vecellio" } })).toBe("renombró a Vece como Vecellio");
    expect(player({ oldData: { nickname: "Vece", base_rating: 5 }, newData: { nickname: "Vece", base_rating: 6.5 } })).toBe(
      "cambió el nivel inicial de Vece (5 → 6,5)",
    );
  });

  it("miembros", () => {
    const member = (partial: Partial<AuditRow>) => describeAudit(row({ entityType: "group_members", ...partial }), ctx)?.text;
    expect(member({ action: "insert", actorId: "u2", newData: { profile_id: "u2" } })).toBe("se sumó al grupo");
    expect(member({ action: "delete", oldData: { profile_id: "u2" } })).toBe("quitó a Manu del grupo");
    expect(member({ oldData: { profile_id: "u2", role: "player" }, newData: { profile_id: "u2", role: "admin" } })).toBe(
      "hizo administrador a Manu",
    );
  });

  it("temporadas, invitaciones y grupo", () => {
    expect(describeAudit(row({ entityType: "seasons", action: "insert", newData: { name: "2026" } }), ctx)?.text).toBe(
      "abrió la temporada 2026",
    );
    expect(
      describeAudit(row({ entityType: "invitations", oldData: { revoked_at: null }, newData: { revoked_at: "x" } }), ctx)?.text,
    ).toBe("revocó un link de invitación");
    expect(describeAudit(row({ entityType: "groups" }), ctx)?.text).toBe("editó los datos del grupo");
    expect(describeAudit(row({ entityType: "otra_cosa", action: "insert" }), ctx)?.category).toBe("other");
  });
});
