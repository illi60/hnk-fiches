UPDATE "ShopCatalogItem"
SET "costXp" = 20,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "itemKey" = 'antidote-universel';

UPDATE "ShopCatalogItem"
SET "costXp" = 40,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "itemKey" = 'stimulant-tetsujin';
