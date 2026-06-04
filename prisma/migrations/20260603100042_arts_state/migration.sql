-- AlterEnum
ALTER TYPE "XPReason" ADD VALUE 'ARTS_SPEND';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "artsState" JSONB;
