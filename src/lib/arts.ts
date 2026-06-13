// ============================================================
// Arts Shinobi — config centrale (source de vérité de l'affichage).
// Noms tirés de wiki-regles-4 (#regles/kg-arts).
//
// 6 Arts principaux + 1 complémentaire (Kuchiyose). 3 spés / art.
// Mécanique (wiki §02 + §08 Apogée) :
//   - Tout Art (et sa spé de base) monte AUTOMATIQUEMENT jusqu'au Rang B.
//   - Au-delà (A, S) : il faut « expertiser » l'Art (3 max parmi les 6).
//     Kuchiyose suit sa propre logique (Mode Ermite), hors du compte.
//   - Les 2 spés non offertes se débloquent/montent en rang contre XP.
//
// ⚠️ TODO : brancher les coûts XP réels (wiki = ??? ; Kuchiyose = 50 XP).
// ============================================================

export const RANKS = ["E", "D", "C", "B", "A", "S"] as const;
export type Rank = (typeof RANKS)[number];

// Plafond de la montée automatique (gratuite). Au-delà = expertise (payant).
export const AUTO_RANK_CAP: Rank = "B";

export interface ArtDef {
  key: string;
  name: string;
  kanji: string;
  complementary?: boolean;
  /** 3 spécialisations. specs[0] = spé de base (offerte, auto). */
  specs: [string, string, string];
}

export const ARTS: ArtDef[] = [
  { key: "ninjutsu", name: "Ninjutsu", kanji: "忍", specs: ["Clanique", "Affinitaire", "Neutre"] },
  { key: "taijutsu", name: "Taijutsu", kanji: "体", specs: ["Mains Nues", "Mains Armées", "Résistance"] },
  { key: "bukijutsu", name: "Bukijutsu", kanji: "武", specs: ["Armes Légères", "Armes Lourdes", "Artillerie"] },
  { key: "genjutsu", name: "Genjutsu", kanji: "幻", specs: ["Prestidigitation", "Altération", "Subjugation"] },
  { key: "fuinjutsu", name: "Fūinjutsu", kanji: "封", specs: ["Libération", "Marquage", "Confinement"] },
  { key: "kanchijutsu", name: "Kanchijutsu", kanji: "感", specs: ["Détection", "Dissimulation", "Intensification"] },
];

export const KUCHIYOSE: ArtDef = {
  key: "kuchiyose",
  name: "Kuchiyose no Jutsu",
  kanji: "口",
  complementary: true,
  specs: ["Lignée", "Apparition", "Bestiale"],
};

// Tous les arts (radar inclut le Kuchiyose).
export const ARTS_ALL: ArtDef[] = [...ARTS, KUCHIYOSE];

export function rankIndex(r?: string | null): number {
  const i = RANKS.indexOf((r ?? "").toUpperCase() as Rank);
  return i < 0 ? 0 : i;
}

/** Rang automatique d'un Art : suit le rang du perso, plafonné à AUTO_RANK_CAP (B). */
export function autoArtRank(characterRank?: string | null): Rank {
  const i = Math.min(rankIndex(characterRank), RANKS.indexOf(AUTO_RANK_CAP));
  return RANKS[i];
}

export function rankClass(r?: string | null): string {
  const g = (r ?? "").trim().toUpperCase();
  return /^[EDCBAS]$/.test(g) ? `rk-${g.toLowerCase()}` : "";
}

export function nextRank(r: Rank): Rank | null {
  const i = RANKS.indexOf(r);
  return i < 0 || i >= RANKS.length - 1 ? null : RANKS[i + 1];
}

// ============================================================
// ÉCONOMIE DES ARTS — coûts PLACEHOLDER (à remplacer plus tard).
// Source de vérité partagée entre l'API (recalcul serveur) et l'UI.
// ============================================================

// Coûts officiels (Système Technique).
/** Monter une spé d'un rang : 10 XP, identique quel que soit le palier (E→D … A→S). */
export const SPEC_RANK_COST = 10;
/** Expertiser un art : progressif selon le nb déjà expertisés (1er, 2e, 3e). */
export const EXPERTISE_COSTS = [25, 50, 75] as const;
export const MAX_EXPERTISE = 3; // 3 arts principaux max expertisables
export const KUCHIYOSE_UNLOCK_COST = 20; // achat d'un Kuchiyose

// Réservés aux systèmes à venir (Techniques / Actions / Quintessence) :
export const TECHNIQUE_RESERVE_COST = 10; // réserver une Technique (hors FTC)
export const ACTION_COST = {
  EVOLUTIVE: 10,
  UNIQUE: 20,
  DURABLE: 20,
  CHARGEE: 20,
  COMPLEXE: 40,
  COMBINEE: 40,
  COLLECTIVE: 60,
  ULTIME: 80,
  SUPREME: 100,
} as const;
export const QUINTESSENCE_COST = 100; // Kekkei Genkai (2e/amélioration) ou Art Shinobi

export interface ArtState {
  expertised?: boolean; // arts principaux : autorise A/S
  unlocked?: boolean; // kuchiyose : obtenu
  owned?: boolean; // art principal débloqué par le joueur (occupe un slot)
  primarySpec?: number; // index 0..2 de la spé PRINCIPALE (suit le rang de l'art). Choix unique.
  specs?: (Rank | null)[]; // rangs stockés des spés non principales (montées en XP)
}
export type ArtsState = Record<string, ArtState>;

export function getArtState(state: ArtsState | null | undefined, key: string): ArtState {
  return (state && state[key]) || {};
}

// ============================================================
// DÉBLOCAGE DES ARTS PAR RANG GLOBAL
//   Rang E : 1 Art · Rang D : 2 Arts · Rang C : 3 Arts (+ Kuchiyose 20 XP)
//   Rang B et + : accès à TOUS les Arts (déblocage automatique).
// Le joueur choisit librement quels Arts occupent ses slots (selectArt).
// Le décompte suit le RANG GLOBAL du personnage (cf. demande staff).
// Le Kuchiyose est hors de ce décompte (logique propre : Mode Ermite / Histoire C).
// ============================================================

/** Nombre de slots d'Arts principaux ouverts selon le rang global. */
export function artSlots(globalRank?: string | null): number {
  const i = rankIndex(globalRank); // E=0 D=1 C=2 B=3 A=4 S=5
  if (i >= RANKS.indexOf("B")) return ARTS.length; // B+ → tous
  return i + 1; // E→1, D→2, C→3
}

/** Un Art principal est-il débloqué ? (À rang global B+, tous le sont.) */
export function isArtOwned(
  state: ArtsState | null | undefined,
  key: string,
  globalRank?: string | null
): boolean {
  if (key === "kuchiyose") return !!getArtState(state, "kuchiyose").unlocked;
  if (rankIndex(globalRank) >= RANKS.indexOf("B")) return true;
  return !!getArtState(state, key).owned;
}

/** Nombre d'Arts principaux actuellement débloqués (occupent un slot). */
export function ownedArtCount(
  state: ArtsState | null | undefined,
  globalRank?: string | null
): number {
  return ARTS.filter((a) => isArtOwned(state, a.key, globalRank)).length;
}

export function isExpertised(state: ArtsState | null | undefined, key: string): boolean {
  return !!getArtState(state, key).expertised;
}

export function expertiseCount(state: ArtsState | null | undefined): number {
  return ARTS.filter((a) => isExpertised(state, a.key)).length;
}

/** Rang effectif d'un Art (= rang de sa spé de base). */
export function artRank(
  artKey: string,
  state: ArtsState | null | undefined,
  villageRank: string | null
): Rank {
  const v = rankIndex(villageRank);
  const st = getArtState(state, artKey);
  if (artKey === "kuchiyose") {
    return st.unlocked ? RANKS[Math.min(v, RANKS.indexOf("B"))] : "E";
  }
  const cap = st.expertised ? RANKS.indexOf("S") : RANKS.indexOf("B");
  return RANKS[Math.min(v, cap)];
}

/** Rang d'une spé : la spé PRINCIPALE (primarySpec) suit le rang de l'art ;
 * les autres sont stockées (def E), plafonnées au rang de l'art. */
export function specRank(
  artKey: string,
  idx: number,
  state: ArtsState | null | undefined,
  villageRank: string | null
): Rank {
  const ar = artRank(artKey, state, villageRank);
  const st = getArtState(state, artKey);
  if (st.primarySpec === idx) return ar;
  const stored = (st.specs && (st.specs[idx] as Rank)) || "E";
  return rankIndex(stored) > rankIndex(ar) ? ar : stored;
}

/**
 * Rang d'une spé d'INVOCATION (Kuchiyose).
 *
 * L'invocation est une entité propre : son Art Shinobi — et donc la spé choisie
 * pour l'une de ses techniques — monte AUTOMATIQUEMENT avec le rang global du
 * joueur, plafonné à AUTO_RANK_CAP (B), exactement comme la spé de base d'un Art.
 *
 * Contrairement à specRank(), ce calcul NE dépend PAS de l'artsState du joueur :
 * l'invocation ne « possède » ni n'« expertise » d'Art au nom du joueur, donc
 * pas de montée A/S et pas de blocage à E faute d'investissement personnel.
 * C'est ce qui fait scaler les spés d'invocation sur le rang global, à l'identique
 * des règles appliquées aux spés du joueur. */
export function invocationSpecRank(globalRank: string | null): Rank {
  return autoArtRank(globalRank);
}

export type ArtAction =
  | { type: "rankSpec"; art: string; spec: number }
  | { type: "expertise"; art: string }
  | { type: "choosePrimary"; art: string; spec: number }
  | { type: "unlockKuchiyose" }
  | { type: "selectArt"; art: string } // débloquer un Art (occupe un slot, gratuit)
  | { type: "deselectArt"; art: string }; // libérer un slot (gratuit, données conservées)

export interface ActionQuote {
  ok: boolean;
  cost: number;
  error?: string;
}

export interface ActionCtx {
  villageRank: string | null;
  histoireRank: string | null;
  xpAvailable: number;
}

function afford(cost: number, xp: number): ActionQuote {
  return xp >= cost ? { ok: true, cost } : { ok: false, cost, error: "XP_INSUFFISANT" };
}

/** Valide une action ET renvoie son coût (recalculé, jamais fourni par le client). */
export function quoteAction(
  action: ArtAction,
  state: ArtsState | null | undefined,
  ctx: ActionCtx
): ActionQuote {
  // Débloquer / libérer un Art principal (gratuit, gaté par le rang global = ctx.villageRank).
  if (action.type === "selectArt") {
    const art = ARTS.find((a) => a.key === action.art);
    if (!art) return { ok: false, cost: 0, error: "ART_INCONNU" };
    if (isArtOwned(state, art.key, ctx.villageRank))
      return { ok: false, cost: 0, error: "DEJA_DEBLOQUE" };
    if (ownedArtCount(state, ctx.villageRank) >= artSlots(ctx.villageRank))
      return { ok: false, cost: 0, error: "SLOTS_PLEINS" };
    return { ok: true, cost: 0 };
  }
  if (action.type === "deselectArt") {
    const art = ARTS.find((a) => a.key === action.art);
    if (!art) return { ok: false, cost: 0, error: "ART_INCONNU" };
    if (rankIndex(ctx.villageRank) >= RANKS.indexOf("B"))
      return { ok: false, cost: 0, error: "DEBLOCAGE_AUTO" }; // B+ : tous débloqués, rien à libérer
    if (!getArtState(state, art.key).owned)
      return { ok: false, cost: 0, error: "NON_DEBLOQUE" };
    return { ok: true, cost: 0 };
  }

  if (action.type === "expertise") {
    const art = ARTS.find((a) => a.key === action.art);
    if (!art) return { ok: false, cost: 0, error: "ART_INCONNU" };
    if (!isArtOwned(state, art.key, ctx.villageRank))
      return { ok: false, cost: 0, error: "ART_NON_DEBLOQUE" };
    // L'expertise ne sert qu'au-delà de B (B→A→S) : inutile avant le Rang B,
    // on bloque pour éviter de gâcher de l'XP.
    if (rankIndex(ctx.villageRank) < RANKS.indexOf("B"))
      return { ok: false, cost: 0, error: "RANG_B_REQUIS" };
    if (isExpertised(state, art.key)) return { ok: false, cost: 0, error: "DEJA_EXPERTISE" };
    const count = expertiseCount(state);
    if (count >= MAX_EXPERTISE) return { ok: false, cost: 0, error: "MAX_EXPERTISE" };
    return afford(EXPERTISE_COSTS[count], ctx.xpAvailable);
  }

  if (action.type === "unlockKuchiyose") {
    if (getArtState(state, "kuchiyose").unlocked)
      return { ok: false, cost: 0, error: "DEJA_OBTENU" };
    if (rankIndex(ctx.histoireRank) < RANKS.indexOf("C"))
      return { ok: false, cost: 0, error: "HISTOIRE_C_REQUIS" };
    return afford(KUCHIYOSE_UNLOCK_COST, ctx.xpAvailable);
  }

  if (action.type === "choosePrimary") return { ok: false, cost: 0, error: "NON_PAYANT" };
  // rankSpec — montée d'une spé NON principale (la principale suit l'art gratuitement).
  const def = ARTS_ALL.find((a) => a.key === action.art);
  if (!def) return { ok: false, cost: 0, error: "ART_INCONNU" };
  if (action.spec < 0 || action.spec > 2)
    return { ok: false, cost: 0, error: "SPE_INVALIDE" };
  const stSpec = getArtState(state, action.art);
  if (stSpec.primarySpec === action.spec)
    return { ok: false, cost: 0, error: "SPE_PRINCIPALE_AUTO" };
  if (action.art === "kuchiyose" && !stSpec.unlocked)
    return { ok: false, cost: 0, error: "KUCHIYOSE_VERROUILLE" };
  if (action.art !== "kuchiyose" && !isArtOwned(state, action.art, ctx.villageRank))
    return { ok: false, cost: 0, error: "ART_NON_DEBLOQUE" };

  const cur = specRank(action.art, action.spec, state, ctx.villageRank);
  const nxt = nextRank(cur);
  if (!nxt) return { ok: false, cost: 0, error: "RANG_MAX" };
  const ar = artRank(action.art, state, ctx.villageRank);
  if (rankIndex(nxt) > rankIndex(ar)) return { ok: false, cost: 0, error: "PLAFOND_ART" };
  return afford(SPEC_RANK_COST, ctx.xpAvailable);
}

/** Applique l'action et renvoie le nouvel état. À n'appeler qu'après quoteAction.ok. */
export function applyAction(
  action: ArtAction,
  state: ArtsState | null | undefined,
  villageRank: string | null
): ArtsState {
  const next: ArtsState = JSON.parse(JSON.stringify(state || {}));
  const ensure = (k: string): ArtState => (next[k] = next[k] || {});
  if (action.type === "selectArt") {
    ensure(action.art).owned = true;
  } else if (action.type === "deselectArt") {
    ensure(action.art).owned = false;
  } else if (action.type === "expertise") {
    ensure(action.art).expertised = true;
  } else if (action.type === "unlockKuchiyose") {
    ensure("kuchiyose").unlocked = true;
  } else if (action.type === "choosePrimary") {
    ensure(action.art).primarySpec = action.spec;
  } else {
    const st = ensure(action.art);
    st.specs = st.specs && st.specs.length === 3 ? st.specs : ["E", "E", "E"];
    const cur = specRank(action.art, action.spec, state, villageRank);
    st.specs[action.spec] = nextRank(cur)!;
  }
  return next;
}
