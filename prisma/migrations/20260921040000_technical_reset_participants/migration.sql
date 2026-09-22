ALTER TABLE "FicheTechnique" ADD COLUMN IF NOT EXISTS "retiredParticipantIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE UNIQUE INDEX IF NOT EXISTS "User_forumUserId_key" ON "User"("forumUserId");
