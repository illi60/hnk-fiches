UPDATE "ShopCatalogItem" AS item
SET
  "name" = data."name",
  "costXp" = data."costXp",
  "description" = data."description",
  "effect" = data."effect",
  "updatedAt" = CURRENT_TIMESTAMP
FROM (
  VALUES
    (
      'relique-tete-trois-faces',
      'Fragment de statuette étrange',
      50,
      'Tête aux traits horrifiques, taillée dans un bois sombre et laqué. Elle possède trois visages : celui de gauche pleure, celui du milieu sourit et celui de droite arbore une expression de colère.',
      'La tête peut s''enchâsser dans un buste compatible.'
    ),
    (
      'relique-buste-triangle-cercle',
      'Fragment de statuette étrange',
      50,
      'Thorax humanoïde taillé dans un bois sombre et laqué. Un symbole est incrusté dans son abdomen : un triangle inversé inscrit dans un cercle. Plusieurs cavités et jointures sont visibles à ses extrémités.',
      'Le buste peut accueillir quatre autres fragments : une tête, deux bras et des membres inférieurs.'
    ),
    (
      'relique-bras-droit-xxx',
      'Fragment de statuette étrange',
      50,
      'Bras droit taillé dans un bois sombre et laqué. Ses doigts crochus se referment autour d''un vajra miniature, impossible à détacher de la paume.',
      'Le bras droit peut s''enchâsser dans un buste compatible.'
    ),
    (
      'relique-bras-gauche-globe',
      'Fragment de statuette étrange',
      50,
      'Bras gauche taillé dans un bois sombre et laqué. Ses doigts crochus soutiennent un globe miniature parfaitement sphérique, enchâssé dans sa paume.',
      'Le bras gauche peut s''enchâsser dans un buste compatible.'
    ),
    (
      'relique-quatre-jambes',
      'Fragment de statuette étrange',
      50,
      'Membres inférieurs taillés dans un bois sombre et laqué. Leur anatomie évoque étrangement celle d''un cheval : quatre jambes maigres prolongent un même corps équin.',
      'Les membres inférieurs peuvent s''enchâsser dans un buste compatible.'
    )
) AS data("itemKey", "name", "costXp", "description", "effect")
WHERE item."itemKey" = data."itemKey";
