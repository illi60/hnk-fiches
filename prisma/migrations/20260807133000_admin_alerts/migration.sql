CREATE TABLE "AdminAlert" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "itemKey" TEXT,
  "itemName" TEXT,
  "costXp" INTEGER,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AdminAlert_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AdminAlert"
  ADD CONSTRAINT "AdminAlert_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "AdminAlert_kind_isRead_createdAt_idx" ON "AdminAlert"("kind", "isRead", "createdAt");
CREATE INDEX "AdminAlert_userId_createdAt_idx" ON "AdminAlert"("userId", "createdAt");
