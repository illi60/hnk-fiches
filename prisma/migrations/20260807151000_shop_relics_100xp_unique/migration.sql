UPDATE "ShopCatalogItem"
SET
  "costXp" = 100,
  "stock" = 'UNIQUE',
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "itemKey" IN (
  'relique-tete-trois-faces',
  'relique-buste-triangle-cercle',
  'relique-bras-droit-xxx',
  'relique-bras-gauche-globe',
  'relique-quatre-jambes'
);
