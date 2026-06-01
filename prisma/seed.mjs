import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { randomBytes } from "crypto";

const prisma = new PrismaClient();

// Small batch of single-use invite codes for the manual-access phase. Run with
// `npx prisma db seed` (or `node prisma/seed.mjs`). Each run mints a fresh batch;
// it never deletes or alters existing codes. Hand the printed codes to testers.
const COUNT = 10;
const PREFIX = "PHASE1";

function makeCode() {
  return `${PREFIX}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

async function main() {
  const codes = Array.from({ length: COUNT }, makeCode);

  for (const code of codes) {
    await prisma.inviteCode.upsert({
      where: { code },
      create: { code, label: "Phase 1 seed", maxUses: 1 },
      update: {},
    });
  }

  console.log(`Seeded ${codes.length} single-use invite codes:`);
  for (const code of codes) console.log(`  ${code}`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
