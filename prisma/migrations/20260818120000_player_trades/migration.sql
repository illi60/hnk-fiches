-- Echanges joueur a joueur: tickets prives, reservations d'inventaire et XP.
ALTER TYPE "XPReason" ADD VALUE IF NOT EXISTS 'TRADE_RESERVE';
ALTER TYPE "XPReason" ADD VALUE IF NOT EXISTS 'TRADE_RELEASE';
ALTER TYPE "XPReason" ADD VALUE IF NOT EXISTS 'TRADE_TRANSFER';

CREATE TYPE "TradeStatus" AS ENUM (
  'REQUESTED',
  'NEGOTIATING',
  'FINAL_PENDING',
  'ACCEPTED',
  'DECLINED',
  'CANCELLED',
  'EXPIRED'
);
CREATE TYPE "TradeSide" AS ENUM ('INITIATOR', 'RECIPIENT');

ALTER TABLE "InventoryItem"
  ADD COLUMN "reservedQuantity" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "Trade" (
  "id" TEXT NOT NULL,
  "initiatorId" TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "status" "TradeStatus" NOT NULL DEFAULT 'REQUESTED',
  "requestMessage" TEXT NOT NULL,
  "initiatorXpOffered" INTEGER NOT NULL DEFAULT 0,
  "recipientXpOffered" INTEGER NOT NULL DEFAULT 0,
  "initiatorSubmitted" BOOLEAN NOT NULL DEFAULT false,
  "recipientSubmitted" BOOLEAN NOT NULL DEFAULT false,
  "initiatorFinalAccepted" BOOLEAN NOT NULL DEFAULT false,
  "recipientFinalAccepted" BOOLEAN NOT NULL DEFAULT false,
  "expiresAt" TIMESTAMP(3),
  "acceptedAt" TIMESTAMP(3),
  "declinedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Trade_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TradeItem" (
  "id" TEXT NOT NULL,
  "tradeId" TEXT NOT NULL,
  "side" "TradeSide" NOT NULL,
  "ownerId" TEXT NOT NULL,
  "itemKey" TEXT NOT NULL,
  "itemName" TEXT NOT NULL,
  "costXp" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,

  CONSTRAINT "TradeItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Trade_initiatorId_status_idx" ON "Trade"("initiatorId", "status");
CREATE INDEX "Trade_recipientId_status_idx" ON "Trade"("recipientId", "status");
CREATE INDEX "Trade_status_createdAt_idx" ON "Trade"("status", "createdAt");
CREATE INDEX "TradeItem_tradeId_idx" ON "TradeItem"("tradeId");
CREATE INDEX "TradeItem_ownerId_itemKey_idx" ON "TradeItem"("ownerId", "itemKey");

ALTER TABLE "Trade"
  ADD CONSTRAINT "Trade_initiatorId_fkey"
  FOREIGN KEY ("initiatorId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Trade"
  ADD CONSTRAINT "Trade_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TradeItem"
  ADD CONSTRAINT "TradeItem_tradeId_fkey"
  FOREIGN KEY ("tradeId") REFERENCES "Trade"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
