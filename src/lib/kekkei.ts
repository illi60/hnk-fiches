// ============================================================
// Catalogue des Kekkei Genkai (annexe wiki · kg-catalogue).
// Chaque KG a un code couleur. Les KG claniques portent leurs 3
// paliers d'évolution (Quintessence / Kinjutsu clanique / Forme finale)
// — réutilisés par le système Quintessences & Modes spéciaux.
// Liste non exhaustive (le wiki autorise d'en imaginer d'autres).
// ============================================================

import type { CSSProperties } from "react";

export interface KGEvolutions {
  quintessence?: string;
  kinjutsu?: string;
  finale?: string;
}

export interface KGDef {
  name: string;
  subtitle: string;
  clan?: string;
  color: string;
  category: "CLANIQUE" | "ELEMENTAIRE" | "DOJUTSU" | "SPECIAL";
  evolutions?: KGEvolutions;
}

export const KEKKEI_GENKAI: KGDef[] = [
  {
    name: "Mokuton",
    subtitle: "Bois · Senju",
    clan: "Senju",
    color: "#5fa46a",
    category: "CLANIQUE",
    evolutions: {
      quintessence: "Assimilation (devenir un homme-bois)",
      kinjutsu: "Mokuton aux capacités anti-Bijuu / Anomalies",
      finale: "Accès au Mode Ermite du Mokuton",
    },
  },
  {
    name: "Sharingan",
    subtitle: "Dōjutsu · Uchiha",
    clan: "Uchiha",
    color: "#d62828",
    category: "DOJUTSU",
    evolutions: {
      quintessence: "Mangekyō Sharingan (un pouvoir par œil)",
      kinjutsu: "Izanagi (revenir à la vie contre une pupille)",
      finale: "Mangekyō Sharingan Éternel (Susano + un pouvoir par œil)",
    },
  },
  {
    name: "Byakugan",
    subtitle: "Dōjutsu · Hyuga",
    clan: "Hyuga",
    color: "#dfe6ee",
    category: "DOJUTSU",
    evolutions: {
      quintessence: "Juken ouvrant le Chakra des non-éveillés",
      kinjutsu: "Extension des propriétés anti-Chakra du Juken",
      finale: "Lecture du destin · Kokugan · Senrigan · Tenseigan",
    },
  },
  {
    name: "Sōzō Saisei",
    subtitle: "Régénération · Uzumaki",
    clan: "Uzumaki",
    color: "#e08aa8",
    category: "CLANIQUE",
    evolutions: {
      quintessence: "Partage vitalité-blessure (Jashin)",
      kinjutsu: "Shiki Fujin (sceller l'âme d'un adversaire)",
      finale: "Edo Tensei (kuchiyose de shinobi et leurs KG)",
    },
  },
  {
    name: "Godai Seishitsu Henka",
    subtitle: "Cinq éléments · Sarutobi",
    clan: "Sarutobi",
    color: "#d9a441",
    category: "CLANIQUE",
    evolutions: {
      quintessence: "Changer la nature d'une affinité en une autre",
      kinjutsu: "Assimilation (devenir un être élémentaire)",
      finale: "Jiton (poussière)",
    },
  },
  { name: "Shakuton", subtitle: "Chaleur · Vapeur", color: "#ff7a3c", category: "ELEMENTAIRE" },
  { name: "Hyoton", subtitle: "Glace", color: "#8fd6e8", category: "ELEMENTAIRE" },
  { name: "Kinton", subtitle: "Métal", color: "#aab4bf", category: "ELEMENTAIRE" },
  { name: "Ranton", subtitle: "Orage", color: "#5b8fd4", category: "ELEMENTAIRE" },
  { name: "Shoton", subtitle: "Cristal", color: "#c69cf0", category: "ELEMENTAIRE" },
  { name: "Yoton", subtitle: "Lave · Caoutchouc · Chaux", color: "#e0502a", category: "ELEMENTAIRE" },
  { name: "Sunaton", subtitle: "Sable", color: "#d8b56b", category: "ELEMENTAIRE" },
  { name: "Bakuton", subtitle: "Explosions", color: "#ff5252", category: "ELEMENTAIRE" },
  { name: "Shikotsumyaku", subtitle: "Os", color: "#d8d0c0", category: "CLANIQUE" },
  { name: "Gijū Ninpō", subtitle: "Symbiose animale", color: "#a07850", category: "CLANIQUE" },
  { name: "Chiton", subtitle: "Sang", color: "#8b1f1a", category: "ELEMENTAIRE" },
  { name: "Jiongu", subtitle: "Fils noirs", color: "#44485a", category: "CLANIQUE" },
  { name: "Kugutsu", subtitle: "Marionnettes", color: "#b5895a", category: "SPECIAL" },
  { name: "Kagemane", subtitle: "Ombre", color: "#5b5f70", category: "CLANIQUE" },
  { name: "Senninka", subtitle: "Mutation corporelle", color: "#8a6cae", category: "CLANIQUE" },
  { name: "Chōjū Giga", subtitle: "Encre", color: "#46506a", category: "SPECIAL" },
  { name: "Shintenshin", subtitle: "Esprit", color: "#8aa6d8", category: "CLANIQUE" },
  { name: "Onkyoton", subtitle: "Son", color: "#9aa0a8", category: "ELEMENTAIRE" },
  { name: "Kamiton", subtitle: "Papier", color: "#ece6d8", category: "ELEMENTAIRE" },
  { name: "Arme à Kekkei Genkai", subtitle: "Arme porteuse de KG", color: "#ff8a4c", category: "SPECIAL" },
];

export const KG_NAMES = KEKKEI_GENKAI.map((k) => k.name);

export function kgDef(name?: string | null): KGDef | undefined {
  if (!name) return undefined;
  return KEKKEI_GENKAI.find((k) => k.name.toLowerCase() === name.toLowerCase());
}

/** Couleur d'un KG (défaut ember si inconnu / libre). */
export function kgColor(name?: string | null): string {
  return kgDef(name)?.color ?? "#ff8a4c";
}

/**
 * Style de carte teinté par la couleur du KG (overlay subtil par-dessus le fond
 * sombre du panneau → reste lisible). Retourne {} si aucun KG (pas de teinte).
 * Le dégradé est posé via backgroundImage : la couleur de fond `.hnk-panel`
 * d'origine est conservée, seul un voile coloré s'ajoute.
 */
export function kgCardStyle(name?: string | null): CSSProperties {
  if (!name) return {};
  const c = kgColor(name);
  return {
    backgroundImage: `linear-gradient(135deg, ${c}2e 0%, ${c}14 38%, rgba(0,0,0,0) 72%)`,
    borderColor: `${c}66`,
    boxShadow: `inset 4px 0 0 ${c}, 0 0 22px ${c}1f`,
  };
}
