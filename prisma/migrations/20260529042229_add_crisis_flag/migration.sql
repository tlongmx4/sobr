-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "CrisisCategory" AS ENUM ('SUICIDAL_IDEATION', 'SELF_HARM', 'HARM_TO_OTHERS', 'SEVERE_DISTRESS', 'OTHER');

-- CreateTable
CREATE TABLE "CrisisFlag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "category" "CrisisCategory" NOT NULL,
    "classifierConfidence" DOUBLE PRECISION,
    "classifierModel" TEXT NOT NULL,
    "reviewed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrisisFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CrisisFlag_userId_createdAt_idx" ON "CrisisFlag"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "CrisisFlag_createdAt_idx" ON "CrisisFlag"("createdAt");

-- AddForeignKey
ALTER TABLE "CrisisFlag" ADD CONSTRAINT "CrisisFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrisisFlag" ADD CONSTRAINT "CrisisFlag_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "ChatMessage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
