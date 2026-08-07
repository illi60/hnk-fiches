UPDATE "ShopCatalogItem"
SET "costXp" = 40,
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "category" = 'OUTILS_SHINOBI'
  AND "stock" = 'UNIQUE';
