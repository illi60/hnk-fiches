-- Ajoute le statut « Modérateur technique » à l'enum Role.
-- (Postgres : ADD VALUE est non transactionnel et irréversible.)
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'TECH_MOD';
