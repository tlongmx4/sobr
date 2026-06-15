import { describe, it, expect, vi, beforeEach } from "vitest";

// The DELETE handler issues a single prisma.user.delete; the actual fan-out to
// CheckIn / ChatMessage / Token / CrisisFlag is enforced by onDelete: Cascade in
// the schema (locked by tests/safety/schema-guarantees.test.ts). Here we verify
// the route requires auth, deletes the right user, and clears the session.

const hoisted = vi.hoisted(() => ({
  userId: "u_1" as string | null,
  userDelete: vi.fn(),
  cookieDelete: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getCurrentUserId: async () => hoisted.userId }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { delete: (...a: unknown[]) => hoisted.userDelete(...a) } },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ delete: (...a: unknown[]) => hoisted.cookieDelete(...a) }),
}));
// Heavy collaborators only used by other handlers in this module — stub them so
// importing the route doesn't pull in Resend/token machinery.
vi.mock("@/lib/email", () => ({ sendVerificationEmail: vi.fn(), sendPasswordResetEmail: vi.fn() }));
vi.mock("@/lib/tokens", () => ({ createToken: vi.fn(), VERIFICATION_TTL_MS: 0 }));

import { DELETE } from "@/app/api/users/route";

// Same-origin request so the CSRF guard (assertSameOrigin) lets the handler run.
function delReq() {
  return new Request("http://localhost/api/users", {
    method: "DELETE",
    headers: { host: "localhost", origin: "http://localhost" },
  });
}

beforeEach(() => {
  hoisted.userId = "u_1";
  hoisted.userDelete.mockReset().mockResolvedValue({});
  hoisted.cookieDelete.mockReset();
});

describe("account deletion", () => {
  it("rejects an unauthenticated request and deletes nothing", async () => {
    hoisted.userId = null;
    const res = await DELETE(delReq());
    expect(res.status).toBe(401);
    expect(hoisted.userDelete).not.toHaveBeenCalled();
  });

  it("deletes only the current user (scoped by id from the session, never the body)", async () => {
    const res = await DELETE(delReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(hoisted.userDelete).toHaveBeenCalledWith({ where: { id: "u_1" } });
  });

  it("clears the session cookie after deletion", async () => {
    await DELETE(delReq());
    expect(hoisted.cookieDelete).toHaveBeenCalledWith("token");
  });
});
