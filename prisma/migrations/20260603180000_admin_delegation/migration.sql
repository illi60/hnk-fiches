ALTER TABLE "User" ADD COLUMN "canManageAdmins" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "canManageAdmins" = true
WHERE "role" = 'ADMIN';
