export const SHOP_CATEGORIES = [
  "RELIQUES",
  "CONTES",
  "OUTILS_SHINOBI",
  "DLC_VILLAGE_C",
  "RUMEURS",
  "TRAMES",
  "SERVICES",
] as const;

export type ShopCategory = (typeof SHOP_CATEGORIES)[number];

export const SHOP_CATEGORY_META: Record<
  ShopCategory,
  { label: string; kanji: string; tone: "gold" | "blue" | "ember" | "jade" | "violet" | "red" | "bone" }
> = {
  RELIQUES: { label: "Reliques", kanji: "碑", tone: "gold" },
  CONTES: { label: "Contes", kanji: "巻", tone: "blue" },
  OUTILS_SHINOBI: { label: "Outils shinobi", kanji: "具", tone: "ember" },
  DLC_VILLAGE_C: { label: "DLC : Village C", kanji: "里", tone: "jade" },
  RUMEURS: { label: "Rumeurs", kanji: "噂", tone: "violet" },
  TRAMES: { label: "Trames", kanji: "文", tone: "red" },
  SERVICES: { label: "Services", kanji: "札", tone: "bone" },
};

export interface ShopItem {
  key: string;
  name: string;
  category: ShopCategory;
  costXp: number;
  stock: "UNLIMITED" | "UNIQUE";
  kanji: string;
  resource?: string;
  rankHint?: string;
  description: string;
  effect: string;
}

export interface ShopRankContext {
  villageRank?: string | null;
  clanRank?: string | null;
  histoireRank?: string | null;
  grade?: string | null;
  hasChuninPromotion?: boolean;
  hasJoninPromotion?: boolean;
}

export const SHOP_SERVICE_GROUPS = [
  "RECONQUETES",
  "PROGRESSION",
  "GRADES",
  "NARRATIFS",
  "BOUTIQUE",
] as const;

export type ShopServiceGroup = (typeof SHOP_SERVICE_GROUPS)[number];

export const SHOP_SERVICE_GROUP_META: Record<ShopServiceGroup, { label: string; kanji: string }> = {
  RECONQUETES: { label: "Reconquêtes", kanji: "旗" },
  PROGRESSION: { label: "Progression", kanji: "段" },
  GRADES: { label: "Grades", kanji: "位" },
  NARRATIFS: { label: "Narratifs", kanji: "糸" },
  BOUTIQUE: { label: "Boutique", kanji: "札" },
};

export function serviceGroupForItem(item: Pick<ShopItem, "key">): ShopServiceGroup | null {
  if (
    item.key === SHOP_DISCOUNT_ITEM_KEY ||
    item.key === SHOP_REROLL_FT_ITEM_KEY ||
    item.key === SHOP_INVITATION_INTERLOPE_ITEM_KEY ||
    item.key === SHOP_MINOR_CLAN_BANNER_ITEM_KEY
  ) {
    return "BOUTIQUE";
  }
  if (item.key.startsWith("reconquete-contree-")) return "RECONQUETES";
  if (item.key.startsWith("condition-rang-")) {
    return "PROGRESSION";
  }
  if (
    item.key.startsWith("promotion-") ||
    item.key.startsWith("changer-bonus-") ||
    item.key === "mutation-corps-special"
  ) {
    return "GRADES";
  }
  if (
    item.key === "cadeau-mystere" ||
    item.key === "titre-personnalise" ||
    item.key === "reroll-trame" ||
    item.key === "pnj-itinerant"
  ) {
    return "NARRATIFS";
  }
  return null;
}

export function isGradeServiceItemKey(itemKey: string): boolean {
  return (
    itemKey.startsWith("promotion-") ||
    itemKey.startsWith("changer-bonus-") ||
    itemKey === "mutation-corps-special"
  );
}

export const SHOP_CONTE_GROUPS = ["BIJUU", "CLANIQUES"] as const;
export type ShopConteGroup = (typeof SHOP_CONTE_GROUPS)[number];

export const SHOP_CONTE_GROUP_META: Record<ShopConteGroup, { label: string; kanji: string }> = {
  BIJUU: { label: "Bijû", kanji: "尾" },
  CLANIQUES: { label: "Claniques", kanji: "氏" },
};

export function conteGroupForItem(item: Pick<ShopItem, "key">): ShopConteGroup | null {
  if (!item.key.startsWith("conte-")) return null;
  return item.key.startsWith("conte-sage-") ? "CLANIQUES" : "BIJUU";
}

export const SHOP_TOOL_GROUPS = ["CONSOMMABLES", "UNIQUES"] as const;
export type ShopToolGroup = (typeof SHOP_TOOL_GROUPS)[number];

export const SHOP_TOOL_GROUP_META: Record<ShopToolGroup, { label: string; kanji: string }> = {
  CONSOMMABLES: { label: "Consommables", kanji: "包" },
  UNIQUES: { label: "Uniques", kanji: "印" },
};

export function toolGroupForItem(item: Pick<ShopItem, "stock">): ShopToolGroup {
  return item.stock === "UNIQUE" ? "UNIQUES" : "CONSOMMABLES";
}

export const RECONQUEST_ITEM_KEYS = [
  "reconquete-contree-300",
  "reconquete-contree-600",
  "reconquete-contree-900",
  "reconquete-contree-1200",
] as const;

export type ReconquestItemKey = (typeof RECONQUEST_ITEM_KEYS)[number];

export function isReconquestItemKey(itemKey: string): itemKey is ReconquestItemKey {
  return (RECONQUEST_ITEM_KEYS as readonly string[]).includes(itemKey);
}

export function isGloballyLimitedShopItem(item: Pick<ShopItem, "category" | "stock">): boolean {
  return item.stock === "UNIQUE" && (item.category === "RELIQUES" || item.category === "CONTES");
}

export function nextReconquestItemKey(completedCount: number): ReconquestItemKey | null {
  return RECONQUEST_ITEM_KEYS[Math.max(0, completedCount)] ?? null;
}

export function filterReconquestItemsForScope(items: ShopItem[], completedCount: number): ShopItem[] {
  const nextKey = nextReconquestItemKey(completedCount);
  return items.filter((item) => !isReconquestItemKey(item.key) || item.key === nextKey);
}

export const SHOP_DISCOUNT_ITEM_KEY = "reduction-marchandises-vie";
export const SHOP_REROLL_FT_ITEM_KEY = "jeton-reroll-ft";
export const SHOP_INVITATION_INTERLOPE_ITEM_KEY = "lettre-cachetee-jdc";
export const SHOP_MINOR_CLAN_BANNER_ITEM_KEY = "banniere-clanique";
export const SHOP_PROMOTION_CHUNIN_ITEM_KEY = "promotion-chunin";
export const SHOP_PROMOTION_JONIN_ITEM_KEY = "promotion-jonin";
export const SHOP_BONUS_CHUNIN_ITEM_KEY = "changer-bonus-chunin";
export const SHOP_BONUS_JONIN_ITEM_KEY = "changer-bonus-jonin";
export const SHOP_BONUS_SANNIN_ITEM_KEY = "changer-bonus-sannin";
export const SHOP_RELIC_ITEM_KEYS = [
  "relique-tete-trois-faces",
  "relique-buste-triangle-cercle",
  "relique-bras-droit-xxx",
  "relique-bras-gauche-globe",
  "relique-quatre-jambes",
] as const;
export type ShopRelicItemKey = (typeof SHOP_RELIC_ITEM_KEYS)[number];
export const SHOP_DISCOUNT_RATE = 0.25;
export const SHOP_INVITATION_INTERLOPE_COSTS = [100, 150, 200] as const;

export function invitationInterlopeCost(purchases: number): number | null {
  return SHOP_INVITATION_INTERLOPE_COSTS[Math.max(0, purchases)] ?? null;
}

export function rerollFtBaseCostForPurchase(item: Pick<ShopItem, "costXp">, previousPurchases: number): number {
  const purchases = Math.max(0, previousPurchases);
  if (purchases === 0) return item.costXp;
  const multiplier = 1.25 * Math.pow(1.5, Math.max(0, purchases - 1));
  return Math.ceil(item.costXp * multiplier);
}

export function discountedShopCost(item: Pick<ShopItem, "key" | "costXp">, hasDiscount: boolean): number {
  if (!hasDiscount || item.key === SHOP_DISCOUNT_ITEM_KEY) return item.costXp;
  return Math.ceil(item.costXp * (1 - SHOP_DISCOUNT_RATE));
}

export function shopItemCost(
  item: Pick<ShopItem, "key" | "costXp">,
  hasDiscount: boolean,
  previousPurchases = 0
): number {
  const baseCost = item.key === SHOP_REROLL_FT_ITEM_KEY ? rerollFtBaseCostForPurchase(item, previousPurchases) : item.costXp;
  if (!hasDiscount || item.key === SHOP_DISCOUNT_ITEM_KEY) return baseCost;
  return Math.ceil(baseCost * (1 - SHOP_DISCOUNT_RATE));
}

const RANKS = ["E", "D", "C", "B", "A", "S"] as const;
type Rank = (typeof RANKS)[number];

function rankIndex(rank?: string | null): number {
  const index = RANKS.indexOf((rank ?? "E").toUpperCase() as Rank);
  return index < 0 ? 0 : index;
}

function effectiveGradeIndex(ranks: ShopRankContext): number {
  const grade = ranks.grade?.toUpperCase();
  const profileGrade = grade === "JONIN" ? 2 : grade === "CHUNIN" ? 1 : grade === "GENIN" ? 0 : 0;
  const inventoryGrade = ranks.hasJoninPromotion ? 2 : ranks.hasChuninPromotion ? 1 : 0;
  return Math.max(profileGrade, inventoryGrade);
}

export function gradeServiceLockReason(itemKey: string, ranks: ShopRankContext): string | null {
  const gradeLevel = effectiveGradeIndex(ranks);
  if (itemKey === SHOP_PROMOTION_CHUNIN_ITEM_KEY && gradeLevel >= 1) {
    return "Grade Chunin déjà acquis";
  }
  if (itemKey === SHOP_PROMOTION_JONIN_ITEM_KEY) {
    if (gradeLevel < 1) return "Grade Chunin requis";
    if (gradeLevel >= 2) return "Grade Jonin déjà acquis";
  }
  if (itemKey === SHOP_BONUS_CHUNIN_ITEM_KEY && gradeLevel < 1) {
    return "Grade Chunin requis";
  }
  if (itemKey === SHOP_BONUS_JONIN_ITEM_KEY && gradeLevel < 2) {
    return "Grade Jonin requis";
  }
  if (itemKey === SHOP_BONUS_SANNIN_ITEM_KEY && gradeLevel < 2) {
    return "Grade Jonin requis";
  }
  return null;
}

export function conditionServiceTarget(itemKey: string):
  | { track: "VILLAGE" | "CLAN" | "HISTOIRE"; rank: Rank; scope: "personnel" | "clanique" | "communautaire" }
  | null {
  const match = /^condition-rang-([dcbas])-(personnel|clanique|communautaire)$/.exec(itemKey);
  if (!match) return null;

  const rank = match[1].toUpperCase() as Rank;
  const scope = match[2] as "personnel" | "clanique" | "communautaire";
  if (scope === "personnel") return { track: "HISTOIRE", rank, scope };
  if (scope === "clanique") return { track: "CLAN", rank, scope };
  return { track: "VILLAGE", rank, scope };
}

export function isShopItemVisibleForUser(item: ShopItem, ranks: ShopRankContext): boolean {
  const conditionTarget = conditionServiceTarget(item.key);
  if (!conditionTarget) return true;

  const currentRank =
    conditionTarget.track === "HISTOIRE"
      ? ranks.histoireRank
      : conditionTarget.track === "CLAN"
        ? ranks.clanRank
        : ranks.villageRank;

  return rankIndex(conditionTarget.rank) === rankIndex(currentRank) + 1;
}

export function isDlcVillageCUnlocked(ranks: ShopRankContext): boolean {
  return rankIndex(ranks.villageRank) >= rankIndex("C");
}

export function isShopItemPurchasableForUser(item: ShopItem, ranks: ShopRankContext): boolean {
  if (item.category === "DLC_VILLAGE_C" && !isDlcVillageCUnlocked(ranks)) return false;
  if (gradeServiceLockReason(item.key, ranks)) return false;
  return isShopItemVisibleForUser(item, ranks);
}

export function isConditionUnlockItemKey(itemKey: string): boolean {
  return conditionServiceTarget(itemKey) !== null;
}

export function isRerollFtItemKey(itemKey: string): boolean {
  return itemKey === SHOP_REROLL_FT_ITEM_KEY;
}

export function isInvitationInterlopeItemKey(itemKey: string): boolean {
  return itemKey === SHOP_INVITATION_INTERLOPE_ITEM_KEY;
}

export function isMinorClanBannerItemKey(itemKey: string): boolean {
  return itemKey === SHOP_MINOR_CLAN_BANNER_ITEM_KEY;
}

export function isTradeableShopItem(item: Pick<ShopItem, "key" | "category">): boolean {
  if (item.category === "SERVICES") return false;
  if (isConditionUnlockItemKey(item.key)) return false;
  if (isRerollFtItemKey(item.key)) return false;
  if (isMinorClanBannerItemKey(item.key)) return false;
  if (isGradeServiceItemKey(item.key)) return false;
  if (item.key === SHOP_DISCOUNT_ITEM_KEY) return false;
  return true;
}

export function filterShopItemsForUser(items: ShopItem[], ranks: ShopRankContext): ShopItem[] {
  return items.filter((item) => isShopItemVisibleForUser(item, ranks));
}

// Catalogue de secours si la table ShopCatalogItem n'est pas encore disponible.
export const SHOP_ITEMS: ShopItem[] = [
  {
    key: "relique-tete-trois-faces",
    name: "Fragment de statuette étrange",
    category: "RELIQUES",
    costXp: 100,
    stock: "UNIQUE",
    kanji: "面",
    resource: "Fragment 1/5",
    rankHint: "Relique unique",
    description: "Tête aux traits horrifiques, taillée dans un bois sombre et laqué. Elle possède trois visages : celui de gauche pleure, celui du milieu sourit et celui de droite arbore une expression de colère.",
    effect: "La tête peut s'enchâsser dans un buste compatible.",
  },
  {
    key: "relique-buste-triangle-cercle",
    name: "Fragment de statuette étrange",
    category: "RELIQUES",
    costXp: 100,
    stock: "UNIQUE",
    kanji: "身",
    resource: "Fragment 2/5",
    rankHint: "Relique unique",
    description: "Thorax humanoïde taillé dans un bois sombre et laqué. Un symbole est incrusté dans son abdomen : un triangle inversé inscrit dans un cercle. Plusieurs cavités et jointures sont visibles à ses extrémités.",
    effect: "Le buste peut accueillir quatre autres fragments : une tête, deux bras et des membres inférieurs.",
  },
  {
    key: "relique-bras-droit-xxx",
    name: "Fragment de statuette étrange",
    category: "RELIQUES",
    costXp: 100,
    stock: "UNIQUE",
    kanji: "腕",
    resource: "Fragment 3/5",
    rankHint: "Relique unique",
    description: "Bras droit taillé dans un bois sombre et laqué. Ses doigts crochus se referment autour d'un vajra miniature, impossible à détacher de la paume.",
    effect: "Le bras droit peut s'enchâsser dans un buste compatible.",
  },
  {
    key: "relique-bras-gauche-globe",
    name: "Fragment de statuette étrange",
    category: "RELIQUES",
    costXp: 100,
    stock: "UNIQUE",
    kanji: "球",
    resource: "Fragment 4/5",
    rankHint: "Relique unique",
    description: "Bras gauche taillé dans un bois sombre et laqué. Ses doigts crochus soutiennent un globe miniature parfaitement sphérique, enchâssé dans sa paume.",
    effect: "Le bras gauche peut s'enchâsser dans un buste compatible.",
  },
  {
    key: "relique-quatre-jambes",
    name: "Fragment de statuette étrange",
    category: "RELIQUES",
    costXp: 100,
    stock: "UNIQUE",
    kanji: "脚",
    resource: "Fragment 5/5",
    rankHint: "Relique unique",
    description: "Membres inférieurs taillés dans un bois sombre et laqué. Leur anatomie évoque étrangement celle d'un cheval : quatre jambes maigres prolongent un même corps équin.",
    effect: "Les membres inférieurs peuvent s'enchâsser dans un buste compatible.",
  },
  {
    key: "conte-ichibi",
    name: "Conte Ichibi",
    category: "CONTES",
    costXp: 100,
    stock: "UNIQUE",
    kanji: "一",
    resource: "Conte bijû",
    description: "Rouleau narratif scellé autour de l'Ichibi.",
    effect: "Objet de lore unique à conserver dans l'inventaire.",
  },
  {
    key: "bombe-fumigene",
    name: "Bombe fumigène",
    category: "OUTILS_SHINOBI",
    costXp: 15,
    stock: "UNLIMITED",
    kanji: "煙",
    resource: "Dissimulation",
    description: "Capsule noire remplie d'une poudre dense et sèche.",
    effect: "Compte comme une dissimulation de zone.",
  },
  {
    key: "kit-soin",
    name: "Kit de soin",
    category: "OUTILS_SHINOBI",
    costXp: 15,
    stock: "UNLIMITED",
    kanji: "薬",
    resource: "Soin",
    description: "Trousse compacte de bandages, onguents et aiguilles de terrain.",
    effect: "Résorbe une blessure du rang du personnage.",
  },
  {
    key: "lettre-cachetee-jdc",
    name: "Invitation interlope",
    category: "TRAMES",
    costXp: 100,
    stock: "UNIQUE",
    kanji: "封",
    rankHint: "Stock global 3",
    resource: "Accès JDC",
    description: "Enveloppe noire dépourvue d'expéditeur, de destinataire et de toute indication permettant d'en retracer l'origine. Un cachet de cire écarlate en interdit l'ouverture ; lorsqu'il est brisé, quelques lignes manuscrites apparaissent aux côtés d'un lieu, d'une heure et d'un nom : le tien.",
    effect: "Confère un accès nominatif à la Trame Jeu du Calmar, ainsi qu'à la Boutique du Marché Noir. Trois exemplaires peuvent circuler sur tout le forum ; le prix augmente à chaque achat global.",
  },
  {
    key: "jeton-reroll-ft",
    name: "Jeton Reroll FT",
    category: "SERVICES",
    costXp: 50,
    stock: "UNLIMITED",
    kanji: "転",
    resource: "Fiche technique",
    description: "Jeton gravé, échangeable contre une reprise encadrée de fiche technique.",
    effect: "Remet la partie technique à zéro. Le prix augmente à chaque achat : +25% au deuxième jeton, puis +50% par jeton supplémentaire.",
  },
  {
    key: SHOP_MINOR_CLAN_BANNER_ITEM_KEY,
    name: "Bannière clanique",
    category: "SERVICES",
    costXp: 250,
    stock: "UNIQUE",
    kanji: "旗",
    rankHint: "Clan mineur",
    description: "Bannière vierge destinée à fonder une lignée secondaire reconnue.",
    effect: "Ouvre une création directe de clan mineur : nom du clan, Kekkei Genkai associé, rang clanique E.",
  },
];

export function getShopItem(key: string): ShopItem | undefined {
  return SHOP_ITEMS.find((item) => item.key === key);
}

export function categoryLabel(category: string): string {
  return SHOP_CATEGORY_META[category as ShopCategory]?.label ?? category.replace(/_/g, " ").toLowerCase();
}
