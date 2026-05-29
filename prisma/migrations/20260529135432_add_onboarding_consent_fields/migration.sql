-- AlterTable
ALTER TABLE "User" ADD COLUMN     "disclaimersAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "disclaimersVersion" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "onboardingCompletedAt" TIMESTAMP(3);
