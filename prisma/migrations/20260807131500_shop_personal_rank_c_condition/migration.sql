INSERT INTO "ShopCatalogItem" (
  "id", "itemKey", "name", "category", "costXp", "stock", "kanji", "resource", "rankHint", "description", "effect", "isActive", "sortOrder", "updatedAt"
) VALUES (
  'shop_condition_rang_c_personnel',
  'condition-rang-c-personnel',
  'Supprimer une condition - Rang C personnel',
  'SERVICES',
  100,
  'UNLIMITED',
  'C',
  'Progression personnelle',
  'Rang C',
  'Cachet administratif qui simplifie une premiere etape personnelle de progression.',
  'Supprime une condition pour atteindre un Rang C personnel.',
  true,
  7065,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("itemKey") DO UPDATE SET
  "name" = EXCLUDED."name",
  "category" = EXCLUDED."category",
  "costXp" = EXCLUDED."costXp",
  "stock" = EXCLUDED."stock",
  "kanji" = EXCLUDED."kanji",
  "resource" = EXCLUDED."resource",
  "rankHint" = EXCLUDED."rankHint",
  "description" = EXCLUDED."description",
  "effect" = EXCLUDED."effect",
  "isActive" = EXCLUDED."isActive",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = CURRENT_TIMESTAMP;
