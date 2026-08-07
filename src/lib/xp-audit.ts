import type { XPReason } from "@prisma/client";

export const XP_MECHANIC_SPEND_REASONS: XPReason[] = [
  "FICHE_VALIDATED",
  "ARTS_SPEND",
  "QUINTESSENCE_SPEND",
  "PROGRESSION_SPEND",
  "SHOP_SPEND",
];

export const XP_STAFF_CREDIT_REASONS: XPReason[] = ["ADMIN_GRANT", "FICHE_REJECTED_REFUND"];
export const XP_STAFF_REMOVE_REASONS: XPReason[] = ["ADMIN_REMOVE"];
export const XP_AUDIT_REASONS: XPReason[] = [
  ...XP_MECHANIC_SPEND_REASONS,
  ...XP_STAFF_CREDIT_REASONS,
  ...XP_STAFF_REMOVE_REASONS,
];

export type XpReasonSums = Partial<Record<XPReason, number>>;

export interface XpAuditInput {
  xpAvailable: number;
  xpTotalEarned: number;
  forumLastXp?: number | null;
  reasonSums: XpReasonSums;
}

export interface XpAudit {
  xpSpentTotal: number;
  staffCredits: number;
  staffRemovals: number;
  staffNet: number;
  sourceXp: number;
  sourceLabel: "forum" | "internal";
  controlledTotal: number;
  expectedAvailable: number;
  extraXp: number;
  missingXp: number;
  hasAlert: boolean;
}

function positive(n: number | null | undefined): number {
  return Math.max(0, n ?? 0);
}

function negativeAbs(n: number | null | undefined): number {
  return Math.abs(Math.min(0, n ?? 0));
}

function sumPositive(reasonSums: XpReasonSums, reasons: XPReason[]): number {
  return reasons.reduce((total, reason) => total + positive(reasonSums[reason]), 0);
}

function sumNegativeAbs(reasonSums: XpReasonSums, reasons: XPReason[]): number {
  return reasons.reduce((total, reason) => total + negativeAbs(reasonSums[reason]), 0);
}

export function xpAudit({ xpAvailable, xpTotalEarned, forumLastXp, reasonSums }: XpAuditInput): XpAudit {
  const xpSpentTotal = sumNegativeAbs(reasonSums, XP_MECHANIC_SPEND_REASONS);
  const staffCredits = sumPositive(reasonSums, XP_STAFF_CREDIT_REASONS);
  const staffRemovals = sumNegativeAbs(reasonSums, XP_STAFF_REMOVE_REASONS);
  const staffNet = staffCredits - staffRemovals;

  // ADMIN_GRANT incrémente xpTotalEarned mais ne représente pas de l'XP générée en RP.
  const internalSource = Math.max(0, xpTotalEarned - positive(reasonSums.ADMIN_GRANT));
  const sourceXp = forumLastXp ?? internalSource;
  const sourceLabel = forumLastXp == null ? "internal" : "forum";
  const controlledTotal = xpAvailable + xpSpentTotal - staffNet;
  const expectedAvailable = sourceXp + staffNet - xpSpentTotal;
  const diff = controlledTotal - sourceXp;
  const extraXp = Math.max(0, diff);
  const missingXp = Math.max(0, -diff);

  return {
    xpSpentTotal,
    staffCredits,
    staffRemovals,
    staffNet,
    sourceXp,
    sourceLabel,
    controlledTotal,
    expectedAvailable,
    extraXp,
    missingXp,
    hasAlert: extraXp > 0,
  };
}
