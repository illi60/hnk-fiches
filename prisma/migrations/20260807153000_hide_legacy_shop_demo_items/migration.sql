UPDATE "ShopCatalogItem"
SET
  "isActive" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "itemKey" IN (
  'fumigene',
  'sceau-entrainement',
  'lame-chakra',
  'masque-operation'
);
