UPDATE "ShopCatalogItem"
SET "costXp" = 100,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "category" = 'CONTES';

UPDATE "ShopCatalogItem"
SET "costXp" = 15,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "category" = 'OUTILS_SHINOBI';
