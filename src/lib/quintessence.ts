// ============================================================
// Quintessences & Modes Spéciaux (wiki-regles-4 §Quintessence + regles-5 §Modes).
//
// - Quintessences : achetables en XP (100 / grille officielle). Personnalisent
//   un Art, un KG, ou octroient un 2nd Kekkei Genkai.
// - Modes Spéciaux : 3 voies liées au Rang Histoire (Ermite / Jinchuriki /
//   Otsutsuki), 3 stades chacun. Le joueur "emprunte une voie" (gaté par le
//   Rang Histoire) ; l'avancement des stades est piloté par le staff (RP/arrangement).
// ============================================================

import { RANKS, rankIndex, QUINTESSENCE_COST, type Rank } from "@/lib/arts";

export { QUINTESSENCE_COST };

// ---------- Quintessences ----------
export const QUINTESSENCE_KINDS = [
  { key: "ART", label: "Quintessence d'Art Shinobi" },
  { key: "KG", label: "Quintessence de Kekkei Genkai" },
  { key: "KG2", label: "Second Kekkei Genkai" },
  { key: "KUCHIYOSE", label: "Quintessence Kuchiyose" },
] as const;
export type QuintessenceKind = (typeof QUINTESSENCE_KINDS)[number]["key"];

// ---------- Blocages (rang minimal requis pour ACHETER une Quintessence) ----------
// - Quintessence d'Art   → Rang A de Village
// - Quintessence de KG   → Rang B de Clan
// - Second Kekkei Genkai → Rang A d'Histoire
// Règle d'exclusion : on peut prendre SOIT une Quintessence de KG, SOIT un 2nd KG,
// mais jamais les deux. La Quintessence d'Art reste cumulable avec l'une ou l'autre.
export type RankTrack = "village" | "clan" | "histoire";
export const QUINT_GATE: Record<QuintessenceKind, { rank: Rank; track: RankTrack }> = {
  ART: { rank: "A", track: "village" },
  KG: { rank: "B", track: "clan" },
  KG2: { rank: "A", track: "histoire" },
  KUCHIYOSE: { rank: "C", track: "histoire" }, // gaté par le rang Histoire (admin only)
};

export interface QuintRanks {
  rangVillage: string | null;
  rangClan: string | null;
  rangHistoire: string | null;
}

function trackRank(ranks: QuintRanks, track: RankTrack): string | null {
  return track === "village"
    ? ranks.rangVillage
    : track === "clan"
    ? ranks.rangClan
    : ranks.rangHistoire;
}

export function quintessenceKindLabel(k?: string | null): string {
  return QUINTESSENCE_KINDS.find((q) => q.key === k)?.label ?? "Quintessence";
}

export interface AcquiredQuintessence {
  kind: QuintessenceKind;
  target: string; // nom de l'art / du KG
}

// ---------- Modes Spéciaux ----------
export type ModePath = "ERMITE" | "JINCHURIKI" | "OTSUTSUKI";

export interface ModeStage {
  label: string;
  grant: string;
}
export interface ModeDef {
  key: ModePath;
  name: string;
  voie: string;
  focus: string;
  kanji: string;
  /** Rang Histoire minimal pour emprunter cette voie (placeholder). */
  histoireMin: string;
  stages: [ModeStage, ModeStage, ModeStage]; // pré-stade, mode, forme finale
}

export const MODES: ModeDef[] = [
  {
    key: "ERMITE",
    name: "Mode Ermite",
    voie: "Purification · Celui qui soigne le Monde",
    focus: "Renforce les Arts Shinobi",
    kanji: "仙",
    histoireMin: "C",
    stages: [
      { label: "Pré-stade Ermite", grant: "Ton pacte obtient une affinité supplémentaire (2)." },
      {
        label: "Mode Ermite",
        grant:
          "Action Évolutive gratuite « Mode Ermite Imparfait » + expertise gratuite du Kuchiyose (en plus des 3 habituelles).",
      },
      {
        label: "Mode Ermite (parfait)",
        grant: "Ton invocation profite de tes Arts, partage ton KG et tes Quintessences.",
      },
    ],
  },
  {
    key: "JINCHURIKI",
    name: "Mode Jinchuriki",
    voie: "Corruption · Celui qui condamne le Monde",
    focus: "Renforce le Kekkei Genkai",
    kanji: "尾",
    histoireMin: "B",
    stages: [
      {
        label: "Pré-stade Jinchuriki",
        grant: "Manteau de Chakra : utilise le Kekkei Genkai de ton Bijuu dans ce mode.",
      },
      {
        label: "Mode Jinchuriki",
        grant:
          "Une (1) Quintessence de ton Kekkei Genkai (hors KG Bijuu) + légère supériorité d'Actions à rang égal.",
      },
      { label: "Mode Jinchuriki (plein)", grant: "Kekkei Genkai de ton Bijuu pleinement maîtrisé." },
    ],
  },
  {
    key: "OTSUTSUKI",
    name: "Mode Otsutsuki",
    voie: "Refus · Celui qui trace son Chemin",
    focus: "Liberté : Arts ET Kekkei Genkai",
    kanji: "筒",
    histoireMin: "C",
    stages: [
      {
        label: "Pré-stade Otsutsuki",
        grant:
          "Au choix : Quintessence de KG, nouveau KG, Quintessence d'Art, nouvelle affinité, Quintessence d'affinité, ou expertise d'Art.",
      },
      { label: "Mode Otsutsuki", grant: "Développe librement Arts et Kekkei Genkai." },
      {
        label: "Mode Otsutsuki (Shinju)",
        grant: "Encode ton Chakra dans l'écorce du Shinju : renaître entre ses racines 1×/Histoire.",
      },
    ],
  },
];

export function modeDef(path?: string | null): ModeDef | undefined {
  return MODES.find((m) => m.key === path);
}

// ---------- État de progression (stocké sur User.progressionState) ----------
export interface ProgressionState {
  quintessences?: AcquiredQuintessence[];
  mode?: { path: ModePath; stage: number }; // stage 1..3 (0 = non engagé)
}

export function getProgression(state: ProgressionState | null | undefined): ProgressionState {
  return { quintessences: state?.quintessences ?? [], mode: state?.mode };
}

// ---------- Achat de Quintessence (XP) ----------
export interface QuintAction {
  kind: QuintessenceKind;
  target: string;
}
export interface QuintQuote {
  ok: boolean;
  cost: number;
  error?: string;
}

export function quoteQuintessence(
  action: QuintAction,
  state: ProgressionState | null | undefined,
  ctx: QuintRanks & { xpAvailable: number }
): QuintQuote {
  if (!QUINTESSENCE_KINDS.some((q) => q.key === action.kind))
    return { ok: false, cost: 0, error: "KIND_INVALIDE" };
  if (!action.target || !action.target.trim())
    return { ok: false, cost: 0, error: "CIBLE_REQUISE" };

  // 1) Blocage de rang (Village / Clan / Histoire selon le type).
  const gate = QUINT_GATE[action.kind];
  if (rankIndex(trackRank(ctx, gate.track)) < RANKS.indexOf(gate.rank)) {
    const err =
      gate.track === "village"
        ? "VILLAGE_REQUIS"
        : gate.track === "clan"
        ? "CLAN_REQUIS"
        : "HISTOIRE_REQUIS";
    return { ok: false, cost: 0, error: err };
  }

  const list = state?.quintessences ?? [];

  // 2a) Quintessence d'Art : une seule au total.
  if (action.kind === "ART" && list.some((q) => q.kind === "ART"))
    return { ok: false, cost: 0, error: "ART_UNIQUE" };

  // 2b) Famille KG : au maximum UNE quintessence (KG OU 2nd KG), jamais les deux,
  //    et jamais en double. (cf. règle « soit une Quint. de KG, soit un 2nd KG ».)
  if (action.kind === "KG" || action.kind === "KG2") {
    if (list.some((q) => q.kind === "KG" || q.kind === "KG2"))
      return { ok: false, cost: 0, error: "KG_EXCLUSIF" };
  }

  // 3) Doublon exact (filet de sécurité).
  const owned = list.some(
    (q) => q.kind === action.kind && q.target.toLowerCase() === action.target.toLowerCase()
  );
  if (owned) return { ok: false, cost: 0, error: "DEJA_ACQUISE" };

  // 4) XP.
  if (ctx.xpAvailable < QUINTESSENCE_COST)
    return { ok: false, cost: QUINTESSENCE_COST, error: "XP_INSUFFISANT" };
  return { ok: true, cost: QUINTESSENCE_COST };
}

export function applyQuintessence(
  action: QuintAction,
  state: ProgressionState | null | undefined
): ProgressionState {
  const next: ProgressionState = JSON.parse(JSON.stringify(getProgression(state)));
  next.quintessences = next.quintessences ?? [];
  next.quintessences.push({ kind: action.kind, target: action.target.trim() });
  return next;
}

// ---------- Emprunter une voie (gaté Rang Histoire) ----------
export function canEngageMode(
  path: ModePath,
  histoireRank: string | null
): { ok: boolean; error?: string } {
  const def = modeDef(path);
  if (!def) return { ok: false, error: "MODE_INVALIDE" };
  if (rankIndex(histoireRank) < RANKS.indexOf(def.histoireMin as (typeof RANKS)[number]))
    return { ok: false, error: "HISTOIRE_REQUIS" };
  return { ok: true };
}

export function engageMode(path: ModePath, state: ProgressionState | null | undefined): ProgressionState {
  const next: ProgressionState = JSON.parse(JSON.stringify(getProgression(state)));
  next.mode = { path, stage: 1 };
  return next;
}

// ---------- KG / affinités réellement possédés ----------
// KG = 1er KG (primaryKg) + chaque "Second Kekkei Genkai" (quintessence KG2).
export function ownedKgs(
  primaryKg: string | null | undefined,
  state: ProgressionState | null | undefined
): string[] {
  const out: string[] = [];
  if (primaryKg) out.push(primaryKg);
  for (const q of state?.quintessences ?? []) {
    if (q.kind === "KG2" && q.target) out.push(q.target);
  }
  return Array.from(new Set(out));
}

// KG complets pour vérifier l'usage d'une technique de bibliothèque commune :
// 1er KG + Seconds KG (quintessences KG2) + KG additionnel posé par l'admin
// (champ User.kekkeiGenkai → "tertiaire").
export function ownedKgsFull(
  primaryKg: string | null | undefined,
  state: ProgressionState | null | undefined,
  adminKekkeiGenkai?: string | null
): string[] {
  const out = ownedKgs(primaryKg, state);
  if (adminKekkeiGenkai && adminKekkeiGenkai.trim()) out.push(adminKekkeiGenkai.trim());
  return Array.from(new Set(out));
}

// Affinités = 1ère affinité (primaryAffinity) + affinités additionnelles (admin / progression).
export function ownedAffinities(
  primaryAffinity: string | null | undefined,
  affinites: string[] | null | undefined
): string[] {
  const out: string[] = [];
  if (primaryAffinity) out.push(primaryAffinity);
  for (const a of affinites ?? []) if (a) out.push(a);
  return Array.from(new Set(out));
}
