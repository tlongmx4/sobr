-- AlterTable
ALTER TABLE "User" ADD COLUMN     "showMilestones" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "EarnedCoin" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "milestone" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EarnedCoin_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EarnedCoin_userId_idx" ON "EarnedCoin"("userId");

-- AddForeignKey
ALTER TABLE "EarnedCoin" ADD CONSTRAINT "EarnedCoin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
