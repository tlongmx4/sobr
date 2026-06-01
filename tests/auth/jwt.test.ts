import { describe, it, expect, vi, beforeEach } from "vitest";
import jwt from "jsonwebtoken";

const hoisted = vi.hoisted(() => ({ cookieValue: undefined as string | undefined }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) =>
      name === "token" && hoisted.cookieValue
        ? { value: hoisted.cookieValue }
        : undefined,
  }),
}));

import { verifyToken, getCurrentUserId } from "@/lib/auth";

const SECRET = process.env.JWT_SECRET!;

function sign(payload: object, opts?: jwt.SignOptions) {
  return jwt.sign(payload, SECRET, opts);
}

beforeEach(() => {
  hoisted.cookieValue = undefined;
});

describe("verifyToken", () => {
  it("returns the decoded payload for a valid token", () => {
    const token = sign({ userId: "u_1", email: "a@b.com" });
    expect(verifyToken(token)).toMatchObject({ userId: "u_1", email: "a@b.com" });
  });

  it("returns null for a token signed with a different secret", () => {
    const token = jwt.sign({ userId: "u_1", email: "a@b.com" }, "some-other-secret");
    expect(verifyToken(token)).toBeNull();
  });

  it("returns null for a tampered token", () => {
    const token = sign({ userId: "u_1", email: "a@b.com" });
    expect(verifyToken(token + "x")).toBeNull();
  });

  it("returns null for an expired token", () => {
    const token = sign({ userId: "u_1", email: "a@b.com" }, { expiresIn: -10 });
    expect(verifyToken(token)).toBeNull();
  });

  it("returns null for garbage input", () => {
    expect(verifyToken("not-a-jwt")).toBeNull();
    expect(verifyToken("")).toBeNull();
  });
});

describe("getCurrentUserId", () => {
  it("returns null when no token cookie is present", async () => {
    expect(await getCurrentUserId()).toBeNull();
  });

  it("returns the userId from a valid token cookie", async () => {
    hoisted.cookieValue = sign({ userId: "u_42", email: "a@b.com" });
    expect(await getCurrentUserId()).toBe("u_42");
  });

  it("returns null for an invalid token cookie", async () => {
    hoisted.cookieValue = "bogus.token.value";
    expect(await getCurrentUserId()).toBeNull();
  });
});
