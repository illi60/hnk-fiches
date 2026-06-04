-- CreateTable
CREATE TABLE "Invocation" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "nom" TEXT NOT NULL,
    "espece" TEXT,
    "affinite" TEXT,
    "kekkeiGenkai" TEXT,
    "image" TEXT,
    "description" TEXT,
    "techniques" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Invocation_ownerId_idx" ON "Invocation"("ownerId");

-- AddForeignKey
ALTER TABLE "Invocation" ADD CONSTRAINT "Invocation_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
