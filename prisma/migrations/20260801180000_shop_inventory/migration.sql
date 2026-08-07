-- Boutique / inventaire joueur.
ALTER TYPE "XPReason" ADD VALUE IF NOT EXISTS 'SHOP_SPEND';

CREATE TABLE "InventoryItem" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "itemKey" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "costXp" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryItem_userId_itemKey_key" ON "InventoryItem"("userId", "itemKey");
CREATE INDEX "InventoryItem_userId_idx" ON "InventoryItem"("userId");
CREATE INDEX "InventoryItem_itemKey_idx" ON "InventoryItem"("itemKey");

ALTER TABLE "InventoryItem"
  ADD CONSTRAINT "InventoryItem_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
