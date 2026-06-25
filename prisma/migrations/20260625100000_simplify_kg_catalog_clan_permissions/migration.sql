-- Simplify the admin KG catalog: forum/progression details live outside this panel.
ALTER TABLE "KekkeiGenkaiCatalog"
  DROP COLUMN IF EXISTS "subtitle",
  DROP COLUMN IF EXISTS "clan",
  DROP COLUMN IF EXISTS "category",
  DROP COLUMN IF EXISTS "quintessence",
  DROP COLUMN IF EXISTS "kinjutsu",
  DROP COLUMN IF EXISTS "finale";

-- Extra KG/affinities that a clan library accepts for collective techniques.
CREATE TABLE "ClanLibraryPermission" (
  "id" TEXT NOT NULL,
  "clan" TEXT NOT NULL,
  "clanKey" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClanLibraryPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClanLibraryPermission_clanKey_kind_value_key"
  ON "ClanLibraryPermission"("clanKey", "kind", "value");

CREATE INDEX "ClanLibraryPermission_clanKey_idx"
  ON "ClanLibraryPermission"("clanKey");
