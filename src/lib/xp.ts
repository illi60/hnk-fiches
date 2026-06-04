// ============================================================
// SOURCE DE VÉRITÉ de l'économie XP.
// Fonctions PURES, sans dépendance DB. Le client peut les
// recalculer pour afficher, mais le serveur NE FAIT JAMAIS
// confiance à une valeur reçue : il recalcule ici à partir de
// l'état persisté.
// ============================================================

import type { Rang } from "@prisma/client";

// ----- Courbes -----

/**
 * XP cumulé requis pour atteindre le niveau n (n ≥ 1).
 * Formule : 100 * n^1.8 (arrondi entier).
 * Niveau 1 = 100, niveau 10 ≈ 6309, niveau 25 ≈ 31548…
 */
export function totalXpForLevel(n: number): number {
  if (n <= 0) return 0;
  return Math.floor(100 * Math.pow(n, 1.8));
}

/**
 * Niveau à partir de l'XP totale gagnée à vie.
 * Itère jusqu'au seuil dépassé.
 */
export function levelFromTotalXp(totalXp: number): number {
  if (totalXp <= 0) return 0;
  let level = 0;
  while (totalXpForLevel(level + 1) <= totalXp) {
    level++;
    if (level > 200) break; // safety
  }
  return level;
}

/**
 * Progression dans le niveau courant (0..1).
 */
export function levelProgress(totalXp: number): {
  level: number;
  current: number;
  next: number;
  ratio: number;
} {
  const level = levelFromTotalXp(totalXp);
  const current = totalXpForLevel(level);
  const next = totalXpForLevel(level + 1);
  const span = Math.max(1, next - current);
  const ratio = Math.min(1, Math.max(0, (totalXp - current) / span));
  return { level, current, next, ratio };
}

// ----- Rang shinobi (palier dérivé du niveau) -----

const RANG_THRESHOLDS: Array<{ min: number; rang: Rang }> = [
  { min: 0, rang: "E" },
  { min: 5, rang: "D" },
  { min: 12, rang: "C" },
  { min: 22, rang: "B" },
  { min: 35, rang: "A" },
  { min: 55, rang: "S" },
];

export function rangFromLevel(level: number): Rang {
  let r: Rang = "E";
  for (const t of RANG_THRESHOLDS) {
    if (level >= t.min) r = t.rang;
  }
  return r;
}

// ----- Coûts de fiches -----

/**
 * Coût d'une fiche selon son rang minimal requis.
 * Échelle indicative (l'admin peut surcharger par fiche).
 */
export const RANG_BASE_COST: Record<Rang, number> = {
  E: 50,
  D: 100,
  C: 200,
  B: 400,
  A: 700,
  S: 1200,
};

export function defaultFicheCost(rangMin: Rang | null | undefined): number {
  if (!rangMin) return RANG_BASE_COST.E;
  return RANG_BASE_COST[rangMin];
}
