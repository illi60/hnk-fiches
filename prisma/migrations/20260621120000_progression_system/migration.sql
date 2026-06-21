-- CreateEnum
CREATE TYPE "ProgressionTrack" AS ENUM ('VILLAGE', 'CLAN', 'HISTOIRE');

-- CreateEnum
CREATE TYPE "ProgressionTier" AS ENUM ('COMMUNITY', 'INDIVIDUAL');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'VALIDATED', 'REJECTED');

-- CreateTable
CREATE TABLE "ProgressionSubmission" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "track" "ProgressionTrack" NOT NULL,
    "tier" "ProgressionTier" NOT NULL,
    "targetRank" "Rang" NOT NULL,
    "condId" TEXT NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "rpTitle" TEXT,
    "rpUrl" TEXT,
    "comment" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgressionSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRank" (
    "id" TEXT NOT NULL,
    "scopeType" "ProgressionTrack" NOT NULL,
    "scopeKey" TEXT NOT NULL,
    "baseRank" "Rang" NOT NULL DEFAULT 'E',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityRank_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProgressionSubmission_status_createdAt_idx" ON "ProgressionSubmission"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ProgressionSubmission_track_tier_scopeKey_status_idx" ON "ProgressionSubmission"("track", "tier", "scopeKey", "status");

-- CreateIndex
CREATE INDEX "ProgressionSubmission_userId_status_idx" ON "ProgressionSubmission"("userId", "status");

-- CreateIndex
CREATE INDEX "ProgressionSubmission_condId_status_idx" ON "ProgressionSubmission"("condId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "CommunityRank_scopeType_scopeKey_key" ON "CommunityRank"("scopeType", "scopeKey");

-- AddForeignKey
ALTER TABLE "ProgressionSubmission" ADD CONSTRAINT "ProgressionSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProgressionSubmission" ADD CONSTRAINT "ProgressionSubmission_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
