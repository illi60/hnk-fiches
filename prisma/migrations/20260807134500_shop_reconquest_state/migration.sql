CREATE TABLE "ShopState" (
  "key" TEXT NOT NULL,
  "intValue" INTEGER NOT NULL DEFAULT 0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ShopState_pkey" PRIMARY KEY ("key")
);

INSERT INTO "ShopState" ("key", "intValue", "metadata", "updatedAt")
SELECT
  'reconquest_progress',
  COALESCE(SUM("quantity"), 0)::INTEGER,
  '{"scope":"forum"}'::jsonb,
  CURRENT_TIMESTAMP
FROM "InventoryItem"
WHERE "itemKey" IN (
  'reconquete-contree-300',
  'reconquete-contree-600',
  'reconquete-contree-900',
  'reconquete-contree-1200'
)
ON CONFLICT ("key") DO NOTHING;
