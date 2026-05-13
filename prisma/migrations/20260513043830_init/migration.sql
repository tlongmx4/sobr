-- CreateEnum
CREATE TYPE "SobrietyStatus" AS ENUM ('SOBER', 'IM_NOT', 'CUTTING_BACK', 'THINKING_ABOUT_IT', 'SUPPORTING_SOMEONE', 'EXPLORING', 'PREFER_NOT_TO_SAY');

-- CreateEnum
CREATE TYPE "FrameworkPreference" AS ENUM ('BIBLE', 'TWELVE_STEP', 'BOTH', 'NEITHER');

-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "preferredName" TEXT,
    "username" TEXT NOT NULL,
    "hobbies" TEXT[],
    "substances" TEXT[],
    "sobrietyStatus" "SobrietyStatus" NOT NULL DEFAULT 'EXPLORING',
    "sobrietyDate" TIMESTAMP(3),
    "frameworkPreference" "FrameworkPreference" NOT NULL DEFAULT 'NEITHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moodRating" INTEGER NOT NULL,
    "energyRating" INTEGER NOT NULL,
    "cravingRating" INTEGER,
    "journalEntry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
