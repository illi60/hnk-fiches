-- Progression submissions: exact participant pseudos + resolved participant ids
ALTER TABLE "ProgressionSubmission"
ADD COLUMN     "collaborators" TEXT[] NOT NULL DEFAULT '{}',
ADD COLUMN     "collaboratorIds" TEXT[] NOT NULL DEFAULT '{}';
