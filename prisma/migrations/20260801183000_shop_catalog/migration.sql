CREATE TABLE "ShopCatalogItem" (
  "id" TEXT NOT NULL,
  "itemKey" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "costXp" INTEGER NOT NULL,
  "stock" TEXT NOT NULL DEFAULT 'UNLIMITED',
  "kanji" TEXT NOT NULL,
  "resource" TEXT,
  "rankHint" TEXT,
  "description" TEXT NOT NULL,
  "effect" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ShopCatalogItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopCatalogItem_itemKey_key" ON "ShopCatalogItem"("itemKey");
CREATE INDEX "ShopCatalogItem_isActive_sortOrder_idx" ON "ShopCatalogItem"("isActive", "sortOrder");
CREATE INDEX "ShopCatalogItem_category_idx" ON "ShopCatalogItem"("category");

INSERT INTO "ShopCatalogItem" (
  "id", "itemKey", "name", "category", "costXp", "stock", "kanji", "resource", "rankHint", "description", "effect", "isActive", "sortOrder", "updatedAt"
) VALUES
  ('shop_fumigene', 'fumigene', 'Fumigene tactique', 'OBJETS', 80, 'UNLIMITED', '煙', 'Poudre noire', NULL, 'Un outil simple pour couvrir une retraite, une diversion ou une entree discrete.', 'A declarer dans un RP ou une mission quand la scene s''y prete.', true, 10, CURRENT_TIMESTAMP),
  ('shop_kit_soin', 'kit-soin', 'Kit de premiers soins', 'OBJETS', 120, 'UNLIMITED', '薬', 'Onguents', NULL, 'Bandages, onguents et petit materiel pour stabiliser une blessure hors combat.', 'Appui narratif pour recuperation, escorte ou mission longue.', true, 20, CURRENT_TIMESTAMP),
  ('shop_parchemin_stockage', 'parchemin-stockage', 'Parchemin de stockage', 'RELIQUES', 180, 'UNIQUE', '封', 'Encre de sceau', NULL, 'Un rouleau scelle permettant de transporter proprement armes et materiel.', 'Objet permanent d''inventaire, utile pour justifier un arsenal compact.', true, 30, CURRENT_TIMESTAMP),
  ('shop_sceau_entrainement', 'sceau-entrainement', 'Sceau d''entrainement', 'AUTRES', 250, 'UNLIMITED', '修', 'Encadrement', 'Recommande D+', 'Acces encadre a une session d''entrainement specialisee avec validation staff.', 'Support RP pour preparer une fiche, une progression ou une scene d''apprentissage.', true, 40, CURRENT_TIMESTAMP),
  ('shop_lame_chakra', 'lame-chakra', 'Lame conductrice de chakra', 'ARMES', 450, 'UNIQUE', '刃', 'Acier conducteur', 'Recommande C+', 'Une arme concue pour conduire plus finement le chakra elementaire.', 'Objet signature, sans reduction automatique du cout des techniques.', true, 50, CURRENT_TIMESTAMP),
  ('shop_masque_operation', 'masque-operation', 'Masque d''operation', 'AUTRES', 600, 'UNIQUE', '面', 'Affectation', 'Accord staff conseille', 'Un masque ceremoniel ou operationnel lie a une affectation particuliere.', 'Objet narratif fort, a synchroniser avec le grade, l''unite speciale ou l''intrigue.', true, 60, CURRENT_TIMESTAMP)
ON CONFLICT ("itemKey") DO NOTHING;
