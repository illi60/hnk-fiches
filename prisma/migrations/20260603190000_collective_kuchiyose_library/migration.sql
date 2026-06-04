-- Nouvelles fonctionnalités : affinité de pacte, Art Shinobi des invocations,
-- bibliothèque commune de clan + techniques collectives co-payées + lien Kuchiyose.

-- AlterTable User : affinité(s) du pacte Kuchiyose
ALTER TABLE "User" ADD COLUMN     "pactAffinities" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable Invocation : Art Shinobi (remplace l'usage du KG)
ALTER TABLE "Invocation" ADD COLUMN     "artShinobi" TEXT;

-- AlterTable FicheTechnique : clan (bibliothèque commune), lien invocation,
-- participants co-payeurs (type d'action COLLECTIVE)
ALTER TABLE "FicheTechnique" ADD COLUMN     "clan" TEXT,
ADD COLUMN     "invocationId" TEXT,
ADD COLUMN     "collaborators" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "collaboratorIds" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Index
CREATE INDEX "FicheTechnique_clan_status_idx" ON "FicheTechnique"("clan", "status");
CREATE INDEX "FicheTechnique_invocationId_idx" ON "FicheTechnique"("invocationId");

-- FK invocation (SetNull si l'invocation est supprimée)
ALTER TABLE "FicheTechnique" ADD CONSTRAINT "FicheTechnique_invocationId_fkey" FOREIGN KEY ("invocationId") REFERENCES "Invocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
