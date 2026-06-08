// ============================================================
// Créateur de Technique — options et coûts (Système Combat).
// Une Technique = description + art + type d'action + manifestation
// (élément / kekkei genkai) + nature (personnelle / kinjutsu).
// Le coût XP dérive du TYPE D'ACTION (recalculé serveur).
// ============================================================

import { ACTION_COST } from "@/lib/arts";
import { kgColor } from "@/lib/kekkei";

export const ART_OPTIONS = [
  "Ninjutsu",
  "Taijutsu",
  "Bukijutsu",
  "Genjutsu",
  "Fūinjutsu",
  "Kanchijutsu",
  "Kuchiyose",
] as const;

// 9 actions (wiki combat §05) + coût (grille officielle).
export const ACTION_TYPES = [
  { key: "EVOLUTIVE", label: "Évolutive", cost: ACTION_COST.EVOLUTIVE },
  { key: "UNIQUE", label: "Unique", cost: ACTION_COST.UNIQUE },
  { key: "DURABLE", label: "Durable", cost: ACTION_COST.DURABLE },
  { key: "CHARGEE", label: "Chargée", cost: ACTION_COST.CHARGEE },
  { key: "COMPLEXE", label: "Complexe", cost: ACTION_COST.COMPLEXE },
  { key: "COMBINEE", label: "Combinée", cost: ACTION_COST.COMBINEE },
  { key: "COLLECTIVE", label: "Tag Team", cost: ACTION_COST.COLLECTIVE },
  { key: "ULTIME", label: "Ultime", cost: ACTION_COST.ULTIME },
  { key: "SUPREME", label: "Suprême", cost: ACTION_COST.SUPREME },
] as const;
export type ActionTypeKey = (typeof ACTION_TYPES)[number]["key"];
export const ACTION_KEYS = ACTION_TYPES.map((a) => a.key) as ActionTypeKey[];

// 5 affinités élémentaires de base (les avancées = Kekkei Genkai).
export const ELEMENTS = ["Katon", "Suiton", "Doton", "Raiton", "Futon"] as const;

export const MANIFESTATIONS = [
  { key: "AUCUNE", label: "Aucune (chakra neutre)" },
  { key: "ELEMENT", label: "Élément" },
  { key: "KEKKEI_GENKAI", label: "Kekkei Genkai" },
] as const;
export type ManifestationKey = (typeof MANIFESTATIONS)[number]["key"];

// Nature d'une technique :
// - PERSONNELLE : technique propre au personnage.
// - COLLECTIVE  : technique de clan, versée dans la bibliothèque commune
//   (visible par tout le clan, utilisable seulement par ceux qui ont le KG associé).
export const NATURES = [
  { key: "PERSONNELLE", label: "Technique personnelle" },
  { key: "COLLECTIVE", label: "Collective (clan)" },
] as const;
export type NatureKey = (typeof NATURES)[number]["key"];

// Legacy : ancien scope des Kinjutsu (conservé pour l'affichage des anciennes fiches).
export const KINJUTSU_SCOPES = [
  { key: "CLAN", label: "Kinjutsu de clan" },
  { key: "VILLAGE", label: "Kinjutsu de village" },
] as const;
export type KinjutsuScopeKey = (typeof KINJUTSU_SCOPES)[number]["key"];

export function techniqueCost(actionType?: string | null): number {
  return ACTION_TYPES.find((t) => t.key === actionType)?.cost ?? 0;
}

// Surcharge appliquée aux techniques de nature « personnelle ».
export const PERSONAL_SURCHARGE = 10;

// Coût final d'une fiche : coût du type d'action + surcharge personnelle.
export function ficheTotalCost(actionType?: string | null, nature?: string | null): number {
  return techniqueCost(actionType) + (nature === "PERSONNELLE" ? PERSONAL_SURCHARGE : 0);
}
export function actionLabel(key?: string | null): string {
  return ACTION_TYPES.find((t) => t.key === key)?.label ?? "—";
}
export function natureLabel(key?: string | null, scope?: string | null, clan?: string | null): string {
  if (key === "COLLECTIVE") {
    return clan ? `Collective · ${clan}` : "Collective (clan)";
  }
  // Legacy : anciennes fiches Kinjutsu.
  if (key === "KINJUTSU") {
    return KINJUTSU_SCOPES.find((s) => s.key === scope)?.label ?? "Kinjutsu";
  }
  if (key === "PERSONNELLE") return "Technique personnelle";
  return "—";
}

export const ART_KANJI: Record<string, string> = {
  Ninjutsu: "忍",
  Taijutsu: "体",
  Bukijutsu: "武",
  Genjutsu: "幻",
  Fūinjutsu: "封",
  Kanchijutsu: "感",
  Kuchiyose: "口",
};

// ============================================================
// Export "forum" : carte HTML auto-contenue (styles inline,
// polices web-safe, pas de <style> ni clip-path) prête à coller
// dans un message Forumactif.
// ============================================================
export interface TechniqueExportData {
  nom: string;
  art: string | null;
  spec?: string | null;
  specRank?: string | null;
  secondaryArt?: string | null;
  actionType: string | null;
  element: string | null;
  kekkeiGenkai: string | null;
  nature: string | null;
  kinjutsuScope: string | null;
  clan?: string | null;
  espece?: string | null; // espèce de l'invocation (techniques de Kuchiyose)
  secondaryElement?: string | null; // 2e affinité (COMBINEE)
  secondaryKekkeiGenkai?: string | null; // 2e KG (COMBINEE)
  description: string;
  coutXp: number;
}

function escapeHtml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Code COURT : s'appuie sur la feuille hébergée (public/forum/hnk-tech.css,
// importée une fois dans la CSS du forum). Seule la couleur du KG est passée
// en variable inline `--kg` → la carte se teinte sans alourdir le message.
export function techniqueForumHtml(t: TechniqueExportData): string {
  const accent = t.kekkeiGenkai ? kgColor(t.kekkeiGenkai) : "#ff8a4c";

  const chip = (txt: string, kg = false) =>
    `<span class="hnk-tech-chip${kg ? " hnk-tech-chip--kg" : ""}">${escapeHtml(txt)}</span>`;

  const chips: string[] = [];
  if (t.art) {
    let artLabel = `${ART_KANJI[t.art] ?? ""} ${t.art}`.trim();
    if (t.spec) artLabel += ` · ${t.spec}`;
    if (t.specRank) artLabel += ` · ${t.specRank}`;
    chips.push(chip(artLabel));
  }
  if (t.secondaryArt) chips.push(chip(`${ART_KANJI[t.secondaryArt] ?? ""} ${t.secondaryArt}`.trim()));
  if (t.espece) chips.push(chip(`口 ${t.espece}`));
  if (t.actionType) chips.push(chip(actionLabel(t.actionType)));
  if (t.element) chips.push(chip(t.element));
  if (t.secondaryElement) chips.push(chip(t.secondaryElement));
  if (t.kekkeiGenkai) chips.push(chip(`KG · ${t.kekkeiGenkai}`, true));
  if (t.secondaryKekkeiGenkai) chips.push(chip(`KG · ${t.secondaryKekkeiGenkai}`, true));
  if (t.nature) chips.push(chip(natureLabel(t.nature, t.kinjutsuScope, t.clan)));

  const meta = `Technique${t.coutXp ? ` &middot; ${t.coutXp} XP` : ""}`;
  const desc = escapeHtml(t.description).replace(/\n/g, "<br>");

  return (
    `<div class="hnk-tech" style="--kg:${accent}">` +
    `<div class="hnk-tech-meta">${meta}</div>` +
    `<div class="hnk-tech-name">${escapeHtml(t.nom)}</div>` +
    `<div class="hnk-tech-chips">${chips.join("")}</div>` +
    `<div class="hnk-tech-desc">${desc}</div>` +
    `</div>`
  );
}
