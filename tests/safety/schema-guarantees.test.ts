import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// Structural guarantees read straight from the Prisma schema. These lock in two
// promises that the rest of the app depends on: CrisisFlag is metadata-only, and
// every user-scoped table cascade-deletes (right-to-be-forgotten end to end).
const schema = readFileSync(
  path.resolve(__dirname, "../../prisma/schema.prisma"),
  "utf8",
);

function modelBlock(name: string): string {
  const m = schema.match(new RegExp(`model ${name}\\s*\\{([\\s\\S]*?)\\n\\}`));
  if (!m) throw new Error(`model ${name} not found in schema`);
  return m[1];
}

describe("CrisisFlag schema — metadata only", () => {
  const block = modelBlock("CrisisFlag");

  it("references the offending message by id, not by copied content", () => {
    expect(block).toMatch(/messageId\s+String/);
    expect(block).toMatch(/message\s+ChatMessage/);
  });

  it("has no column that could hold message content / PII", () => {
    // Any of these field names would mean chat text is being copied into the flag.
    for (const forbidden of ["content", "text", "body", "journalEntry", "message String", "excerpt", "snippet"]) {
      expect(block).not.toContain(forbidden);
    }
  });

  it("carries only classifier metadata fields", () => {
    expect(block).toMatch(/severity\s+Severity/);
    expect(block).toMatch(/category\s+CrisisCategory/);
    expect(block).toMatch(/classifierConfidence\s+Float\?/);
    expect(block).toMatch(/classifierModel\s+String/);
  });
});

describe("Cascade delete — right to be forgotten", () => {
  it.each(["CheckIn", "ChatMessage", "Token", "CrisisFlag"])(
    "%s cascade-deletes with its User",
    (model) => {
      const block = modelBlock(model);
      expect(block).toMatch(
        /user\s+User\s+@relation\([^)]*onDelete:\s*Cascade[^)]*\)/,
      );
    },
  );

  it("CrisisFlag also cascade-deletes when its ChatMessage is removed", () => {
    const block = modelBlock("CrisisFlag");
    expect(block).toMatch(
      /message\s+ChatMessage\s+@relation\([^)]*onDelete:\s*Cascade[^)]*\)/,
    );
  });
});
