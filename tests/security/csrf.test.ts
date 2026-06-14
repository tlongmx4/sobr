import { describe, it, expect } from "vitest";
import { assertSameOrigin } from "@/lib/csrf";

// The helper only reads request.headers, so a lightweight Headers-backed stub is
// enough and avoids fetch's forbidden-header stripping on `host`.
function reqWith(headers: Record<string, string>): Request {
  return { headers: new Headers(headers) } as unknown as Request;
}

const HOST = "localhost:3000";

describe("assertSameOrigin", () => {
  it("allows a same-origin request (Origin host matches Host)", () => {
    const res = assertSameOrigin(
      reqWith({ host: HOST, origin: `http://${HOST}` }),
    );
    expect(res).toBeNull();
  });

  it("allows a same-origin request including the port in Host", () => {
    const res = assertSameOrigin(
      reqWith({ host: "localhost:3000", origin: "http://localhost:3000" }),
    );
    expect(res).toBeNull();
  });

  it("rejects a cross-origin request with 403", async () => {
    const res = assertSameOrigin(
      reqWith({ host: HOST, origin: "https://evil.com" }),
    );
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    expect((await res!.json()).error).toBe("Invalid request origin");
  });

  it("falls back to Referer when Origin is absent (same-origin → null)", () => {
    const res = assertSameOrigin(
      reqWith({ host: HOST, referer: `http://${HOST}/dashboard` }),
    );
    expect(res).toBeNull();
  });

  it("rejects via Referer when it is cross-origin", () => {
    const res = assertSameOrigin(
      reqWith({ host: HOST, referer: "https://evil.com/x" }),
    );
    expect(res!.status).toBe(403);
  });

  it("rejects when both Origin and Referer are absent", () => {
    const res = assertSameOrigin(reqWith({ host: HOST }));
    expect(res!.status).toBe(403);
  });

  it("rejects when the Host header is missing", () => {
    const res = assertSameOrigin(reqWith({ origin: `http://${HOST}` }));
    expect(res!.status).toBe(403);
  });

  it("rejects a malformed Origin", () => {
    const res = assertSameOrigin(reqWith({ host: HOST, origin: "not a url" }));
    expect(res!.status).toBe(403);
  });
});
