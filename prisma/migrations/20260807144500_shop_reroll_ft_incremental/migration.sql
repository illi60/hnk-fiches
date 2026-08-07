UPDATE "ShopCatalogItem"
SET
  "effect" = 'Remet la partie technique à zéro. Le prix augmente à chaque achat : +25% au deuxième jeton, puis +50% par jeton supplémentaire.'
WHERE "itemKey" = 'jeton-reroll-ft';
