import { describe, expect, it } from "vitest";
import { createInvitationSchema } from "./schemas";
import { invitationStatus } from "./status";

const now = new Date("2026-10-16T12:00:00Z");
const base = { revoked_at: null, expires_at: null, max_uses: null, use_count: 0 };

describe("invitationStatus", () => {
  it("activa por defecto", () => {
    expect(invitationStatus(base, now)).toBe("valid");
  });

  it("revocada tiene prioridad", () => {
    expect(invitationStatus({ ...base, revoked_at: "2026-10-01T00:00:00Z", expires_at: "2026-10-02T00:00:00Z" }, now)).toBe("revoked");
  });

  it("vencida", () => {
    expect(invitationStatus({ ...base, expires_at: "2026-10-16T11:59:59Z" }, now)).toBe("expired");
  });

  it("agotada", () => {
    expect(invitationStatus({ ...base, max_uses: 3, use_count: 3 }, now)).toBe("exhausted");
  });
});

describe("createInvitationSchema", () => {
  const groupId = "6f1c2b9e-8a4d-4c2b-9f1e-2d3c4b5a6f70";
  const playerId = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

  it("una invitación para una ficha es de un solo uso", () => {
    const result = createInvitationSchema.parse({ groupId, playerId, maxUses: "20" });
    expect(result.maxUses).toBe(1);
  });

  it("los campos vacíos del formulario quedan sin valor", () => {
    const result = createInvitationSchema.parse({ groupId, maxUses: "", playerId: "" });
    expect(result).toMatchObject({ role: "player", expiresIn: "7", maxUses: undefined, playerId: undefined });
  });
});
