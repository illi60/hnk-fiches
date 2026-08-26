-- Ajoute le statut « Modérateur forum » à l'enum Role.

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'FORUM_MOD';
