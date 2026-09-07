// ============================================================
// Créateur de Technique — options et coûts (Système Combat).
// Une Technique = description + art + type d'action + manifestation
// (élément / kekkei genkai) + nature (personnelle / kinjutsu).
// Le coût XP dérive du TYPE D'ACTION (recalculé serveur).
// ============================================================

import { ACTION_COST } from "@/lib/arts";
import { ARTS_ALL } from "@/lib/arts";
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

export const KINJUTSU_NATURE = { key: "KINJUTSU", label: "Kinjutsu" } as const;

// Scopes Kinjutsu partagés. Les scopes d'unité spéciale sont stockés sous la
// forme UNIT:<nom unite> et se débloquent au grade Chunin côté accès.
export const KINJUTSU_SCOPES = [
  { key: "PLAYER", label: "Kinjutsu · Joueur" },
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
  if (key === "KINJUTSU") {
    if (scope?.startsWith("UNIT:")) return `Kinjutsu · ${scope.slice(5)}`;
    if (scope === "PLAYER") return "Kinjutsu · Joueur";
    return KINJUTSU_SCOPES.find((s) => s.key === scope)?.label ?? "Kinjutsu";
  }
  if (key === "PERSONNELLE") return "Technique personnelle";
  return "—";
}

export function techniqueArtChipLabel({
  art,
  spec,
  specRank,
  nature,
}: {
  art: string | null;
  spec: string | null;
  specRank: string | null;
  nature: string | null;
}) {
  if (!art) return null;
  const key = art.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const defaultSpec = nature === "COLLECTIVE" ? ARTS_ALL.find((a) => a.key === key)?.specs[0] ?? null : null;
  const resolvedSpec = spec ?? defaultSpec;
  let label = `${ART_KANJI[art] ?? ""} ${art}`.trim();
  if (resolvedSpec || specRank) {
    label += ` - ${resolvedSpec ?? ""}${specRank ? ` (${specRank})` : ""}`;
  }
  return label;
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
  secondarySpec?: string | null;
  secondarySpecRank?: string | null;
  actionType: string | null;
  element: string | null;
  kekkeiGenkai: string | null;
  kgColorHex?: string | null;
  nature: string | null;
  kinjutsuScope: string | null;
  clan?: string | null;
  espece?: string | null; // espèce de l'invocation (techniques de Kuchiyose)
  secondaryElement?: string | null; // 2e affinité (COMBINEE)
  secondaryKekkeiGenkai?: string | null; // 2e KG (COMBINEE)
  secondaryKgColorHex?: string | null;
  invocationNom?: string | null;
  invocationRank?: string | null;
  description: string;
  coutXp: number;
  status?: string | null;
}

function escapeHtml(s: string): string {
  return (s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Brouillon",
  PENDING: "En attente",
  VALIDATED: "Validée",
  REJECTED: "Refusée",
};

const STATUS_COLOR: Record<string, string> = {
  DRAFT: "#9ca3af",
  PENDING: "#ffb84d",
  VALIDATED: "#34d399",
  REJECTED: "#f87171",
};

function cardAccent(t: TechniqueExportData) {
  if (t.nature === "KINJUTSU") return "#ff5722";
  if (t.espece || t.invocationNom) return "#1db99f";
  return t.kgColorHex ?? (t.kekkeiGenkai ? kgColor(t.kekkeiGenkai) : "#ff5722");
}

// HTML autonome : le forum garde la carte lisible même si sa CSS globale change.
export function techniqueForumHtml(t: TechniqueExportData): string {
  const accent = cardAccent(t);
  const isKuchyTechnique =
    !!t.espece ||
    !!t.invocationNom ||
    (t.art ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase() === "kuchiyose";
  const isKinjutsu = t.nature === "KINJUTSU";

  const chip = (txt: string, options: { color?: string; strong?: boolean } = {}) => {
    const color = options.color ?? (isKinjutsu ? "#ff8a4c" : isKuchyTechnique ? "#d9fff6" : "#e8e2da");
    const border = options.color ?? (isKuchyTechnique ? "rgba(29,185,159,0.58)" : "rgba(255,255,255,0.28)");
    const bg = options.strong ? "rgba(255,87,34,0.13)" : isKuchyTechnique ? "rgba(29,185,159,0.08)" : "rgba(255,255,255,0.03)";
    return (
      `<span style="display:inline-block;margin:0 7px 7px 0;padding:5px 10px;` +
      `border:1px solid ${border};background:${bg};color:${color};` +
      `font:800 11px/1.35 Arial,Helvetica,sans-serif;letter-spacing:1.1px;` +
      `text-transform:uppercase;border-radius:2px;">${escapeHtml(txt)}</span>`
    );
  };

  const chips: string[] = [];
  if (isKinjutsu) chips.push(chip(natureLabel(t.nature, t.kinjutsuScope, t.clan), { color: "#ff8a4c", strong: true }));
  if (isKuchyTechnique) chips.push(chip("Kuchiyose", { color: "#d9fff6" }));
  const artLabel = techniqueArtChipLabel({
    art: t.art,
    spec: t.spec ?? null,
    specRank: t.specRank ?? null,
    nature: t.nature,
  });
  if (artLabel) chips.push(chip(artLabel));
  const secondaryLabel = techniqueArtChipLabel({
    art: t.secondaryArt ?? null,
    spec: t.secondarySpec ?? null,
    specRank: t.secondarySpecRank ?? null,
    nature: t.nature,
  });
  if (secondaryLabel && t.secondaryArt) chips.push(chip(`+ ${secondaryLabel}`));
  if (t.actionType) chips.push(chip(actionLabel(t.actionType)));
  if (t.element) chips.push(chip(t.element));
  if (t.secondaryElement) chips.push(chip(t.secondaryElement));
  if (t.kekkeiGenkai) chips.push(chip(`KG · ${t.kekkeiGenkai}`, { color: t.kgColorHex ?? kgColor(t.kekkeiGenkai) }));
  if (t.secondaryKekkeiGenkai) {
    chips.push(chip(`KG · ${t.secondaryKekkeiGenkai}`, {
      color: t.secondaryKgColorHex ?? kgColor(t.secondaryKekkeiGenkai),
    }));
  }
  if (t.invocationNom || t.espece || t.invocationRank) {
    chips.push(
      chip(
        [
          "口",
          t.espece,
          t.invocationNom,
          t.invocationRank ? `Rang ${t.invocationRank}` : null,
        ]
          .filter(Boolean)
          .join(" · ")
      )
    );
  }
  if (t.nature && !isKinjutsu) chips.push(chip(natureLabel(t.nature, t.kinjutsuScope, t.clan)));

  const status = t.status ? STATUS_LABEL[t.status] ?? t.status : null;
  const statusColor = t.status ? STATUS_COLOR[t.status] ?? "#9ca3af" : "#9ca3af";
  const desc = escapeHtml(t.description).replace(/\n/g, "<br>");
  const kanji = isKinjutsu ? "禁" : isKuchyTechnique ? "口" : "技";
  const bg =
    isKinjutsu
      ? "linear-gradient(135deg, rgba(255,87,34,0.22) 0%, rgba(255,184,77,0.08) 42%, rgba(0,0,0,0) 76%), linear-gradient(160deg, rgba(18,20,27,0.98), rgba(10,11,14,0.96))"
      : isKuchyTechnique
      ? "linear-gradient(135deg, rgba(29,185,159,0.18) 0%, rgba(255,184,77,0.08) 44%, rgba(0,0,0,0) 76%), linear-gradient(160deg, rgba(18,20,27,0.98), rgba(10,11,14,0.96))"
      : `linear-gradient(135deg, ${accent}2e 0%, ${accent}14 38%, rgba(0,0,0,0) 72%), linear-gradient(160deg, rgba(18,20,27,0.98), rgba(10,11,14,0.96))`;

  return (
    `<div class="hnk-tech${isKuchyTechnique ? " hnk-tech--kuchy" : ""}" data-kanji="${kanji}" style="position:relative;max-width:820px;margin:14px 0;padding:18px;overflow:hidden;` +
    `background:${bg};border:1px solid ${isKinjutsu ? "rgba(255,87,34,0.55)" : isKuchyTechnique ? "rgba(29,185,159,0.48)" : `${accent}66`};` +
    `border-left:5px solid ${accent};box-shadow:inset 0 1px 0 rgba(255,255,255,0.04),0 0 24px rgba(0,0,0,0.22);` +
    `color:#e8e2da;font-family:Arial,Helvetica,sans-serif;">` +
    `<div aria-hidden="true" style="position:absolute;right:22px;top:10px;color:rgba(255,255,255,0.035);font:900 86px/1 Georgia,serif;">${kanji}</div>` +
    `<div style="position:relative;z-index:1;display:flex;align-items:flex-start;justify-content:space-between;gap:16px;">` +
    `<div style="min-width:0;color:#fff;font:900 20px/1.2 Georgia,'Times New Roman',serif;letter-spacing:1.2px;text-transform:uppercase;word-break:break-word;">${escapeHtml(t.nom)}</div>` +
    (status
      ? `<div style="flex:none;color:${statusColor};font:800 10px/1 Arial,Helvetica,sans-serif;letter-spacing:2px;text-transform:uppercase;">${escapeHtml(status)}</div>`
      : "") +
    `</div>` +
    `<div style="position:relative;z-index:1;margin-top:14px;">${chips.join("")}</div>` +
    `<div style="position:relative;z-index:1;margin-top:10px;color:#d8d2cc;font:14px/1.65 Arial,Helvetica,sans-serif;text-align:justify;white-space:pre-line;">${desc}</div>` +
    `<div style="position:relative;z-index:1;margin-top:14px;color:#8f9aa8;font:12px/1 Arial,Helvetica,sans-serif;">${t.coutXp} XP</div>` +
    `<div style="position:absolute;inset:0;pointer-events:none;background-image:repeating-linear-gradient(135deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 8px);"></div>` +
    `</div>`
  );
}
