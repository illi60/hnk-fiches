-- Action COMBINEE : 2e affinité / 2e KG. + Espèce du pacte Kuchiyose.
ALTER TABLE "FicheTechnique" ADD COLUMN     "secondaryElement" TEXT,
ADD COLUMN     "secondaryKekkeiGenkai" TEXT;

ALTER TABLE "User" ADD COLUMN     "pactSpecies" TEXT;
