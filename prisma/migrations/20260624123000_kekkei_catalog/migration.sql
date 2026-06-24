-- Catalogue administrable des Kekkei Genkai
CREATE TABLE "KekkeiGenkaiCatalog" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subtitle" TEXT,
    "clan" TEXT,
    "color" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quintessence" TEXT,
    "kinjutsu" TEXT,
    "finale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KekkeiGenkaiCatalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KekkeiGenkaiCatalog_name_key" ON "KekkeiGenkaiCatalog"("name");
