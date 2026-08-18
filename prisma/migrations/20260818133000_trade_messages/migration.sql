-- Fil de discussion par ticket d'echange.
CREATE TABLE "TradeMessage" (
  "id" TEXT NOT NULL,
  "tradeId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "TradeMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TradeMessage_tradeId_createdAt_idx" ON "TradeMessage"("tradeId", "createdAt");
CREATE INDEX "TradeMessage_authorId_createdAt_idx" ON "TradeMessage"("authorId", "createdAt");

ALTER TABLE "TradeMessage"
  ADD CONSTRAINT "TradeMessage_tradeId_fkey"
  FOREIGN KEY ("tradeId") REFERENCES "Trade"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TradeMessage"
  ADD CONSTRAINT "TradeMessage_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
