-- AlterEnum
ALTER TYPE "XPReason" ADD VALUE 'QUINTESSENCE_SPEND';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "progressionState" JSONB;
