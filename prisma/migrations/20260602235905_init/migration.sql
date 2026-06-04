-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Rang" AS ENUM ('E', 'D', 'C', 'B', 'A', 'S');

-- CreateEnum
CREATE TYPE "Grade" AS ENUM ('GENIN', 'CHUNIN', 'JONIN');

-- CreateEnum
CREATE TYPE "FicheStatus" AS ENUM ('DRAFT', 'PENDING', 'VALIDATED', 'REJECTED');

-- CreateEnum
CREATE TYPE "XPReason" AS ENUM ('ADMIN_GRANT', 'ADMIN_REMOVE', 'REGISTRATION_BONUS', 'FORUM_SYNC', 'FICHE_VALIDATED', 'FICHE_REJECTED_REFUND');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "xpAvailable" INTEGER NOT NULL DEFAULT 0,
    "xpTotalEarned" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 0,
    "clan" TEXT,
    "rang" "Rang",
    "grade" "Grade",
    "uniteSpeciale" TEXT,
    "trame" TEXT,
    "prime" TEXT,
    "age" INTEGER,
    "genre" TEXT,
    "kekkeiGenkai" TEXT,
    "affinites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "forumProfileUrl" TEXT,
    "forumUserId" INTEGER,
    "forumPseudo" TEXT,
    "forumLastXp" INTEGER,
    "forumLastRang" TEXT,
    "forumPresentationUrl" TEXT,
    "forumCarnetUrl" TEXT,
    "forumLastSyncAt" TIMESTAMP(3),
    "forumLastSyncError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FicheTechnique" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT,
    "element" TEXT,
    "rangMin" "Rang",
    "coutXp" INTEGER NOT NULL DEFAULT 0,
    "status" "FicheStatus" NOT NULL DEFAULT 'DRAFT',
    "rejectionReason" TEXT,
    "authorId" TEXT NOT NULL,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FicheTechnique_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XPTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "actorId" TEXT,
    "amount" INTEGER NOT NULL,
    "reason" "XPReason" NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "XPTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "User_forumUserId_idx" ON "User"("forumUserId");

-- CreateIndex
CREATE UNIQUE INDEX "FicheTechnique_slug_key" ON "FicheTechnique"("slug");

-- CreateIndex
CREATE INDEX "FicheTechnique_authorId_status_idx" ON "FicheTechnique"("authorId", "status");

-- CreateIndex
CREATE INDEX "FicheTechnique_status_createdAt_idx" ON "FicheTechnique"("status", "createdAt");

-- CreateIndex
CREATE INDEX "XPTransaction_userId_createdAt_idx" ON "XPTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "XPTransaction_reason_createdAt_idx" ON "XPTransaction"("reason", "createdAt");

-- AddForeignKey
ALTER TABLE "FicheTechnique" ADD CONSTRAINT "FicheTechnique_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FicheTechnique" ADD CONSTRAINT "FicheTechnique_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XPTransaction" ADD CONSTRAINT "XPTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "XPTransaction" ADD CONSTRAINT "XPTransaction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
