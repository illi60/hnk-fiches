UPDATE "ShopCatalogItem"
SET
  "rankHint" = 'Boutique',
  "description" = 'Jeton administratif permettant de repartir d''une fiche technique vierge sans toucher au profil RP.',
  "effect" = 'Rembourse les XP techniques dépensés, débite le prix du jeton, puis remet à zéro les fiches techniques, invocations, Arts Shinobi, Kekkei Genkai et affinités.'
WHERE "itemKey" = 'jeton-reroll-ft';
