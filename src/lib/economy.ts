/** Authoritative XP accounting. Balances and grants are never sources of funds. */
export type EconomyEntry = { id: string; amount: number; reason: string; metadata: unknown; createdAt: Date };
export type EconomyTrade = {
  status: string; initiatorId: string; recipientId: string;
  initiatorXpOffered: number; recipientXpOffered: number;
};
export const TECHNICAL_REASONS = new Set(['FICHE_VALIDATED', 'ARTS_SPEND']);
const COST_REASONS = new Set([...TECHNICAL_REASONS, 'QUINTESSENCE_SPEND', 'PROGRESSION_SPEND', 'SHOP_SPEND', 'ADMIN_REMOVE']);
export const ECONOMY_BASELINE_SOURCE = 'XP_BUDGET_BASELINE';
export function metadataObject(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function projectEconomy(userId: string, forumXp: number | null, entries: EconomyEntry[], trades: EconomyTrade[]) {
  const remaining = new Map<string, { entry: EconomyEntry; amount: number }>();
  const anomalies: string[] = [];
  let refunds = 0;
  // IDs break ties for display only. New refunds reference their exact debit IDs,
  // so equal timestamps cannot make a debit disappear or become refundable twice.
  const ordered = [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
  const baselineIndex = ordered.reduce((last, entry, index) =>
    entry.reason === 'FORUM_SYNC' && entry.amount === 0 && metadataObject(entry.metadata).source === ECONOMY_BASELINE_SOURCE ? index : last, -1);
  if (baselineIndex >= 0) {
    const baseline = ordered[baselineIndex];
    const meta = metadataObject(baseline.metadata);
    const allocations = Array.isArray(meta.allocations) ? meta.allocations : [];
    if (!Array.isArray(meta.allocations)) anomalies.push(`INVALID_BASELINE:${baseline.id}`);
    const entriesById = new Map(ordered.slice(0, baselineIndex).map(entry => [entry.id, entry]));
    for (const raw of allocations) {
      const allocation = metadataObject(raw);
      const debit = entriesById.get(String(allocation.debitId));
      const amount = allocation.amount;
      if (!debit || remaining.has(debit.id) || debit.amount >= 0 || !TECHNICAL_REASONS.has(debit.reason) || typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0 || amount > -debit.amount) {
        anomalies.push(`INVALID_BASELINE:${baseline.id}`);
        continue;
      }
      remaining.set(debit.id, { entry: debit, amount });
    }
    const nonRefundable = meta.nonRefundable;
    if (typeof nonRefundable === 'number' && Number.isSafeInteger(nonRefundable) && nonRefundable > 0) {
      remaining.set(`${baseline.id}:holdings`, {
        entry: { ...baseline, id: `${baseline.id}:holdings`, amount: -nonRefundable, reason: 'SHOP_SPEND' },
        amount: nonRefundable,
      });
    } else if (nonRefundable !== 0) {
      anomalies.push(`INVALID_BASELINE:${baseline.id}`);
    }
  }
  for (const [index, entry] of ordered.entries()) {
    const meta = metadataObject(entry.metadata);
    if (index > baselineIndex && entry.amount < 0 && COST_REASONS.has(entry.reason) && !meta.tradeId && meta.source !== 'FORUM_BUDGET_RECONCILIATION') {
      remaining.set(entry.id, { entry, amount: -entry.amount });
    }
  }
  for (const [index, entry] of ordered.entries()) {
    if (index <= baselineIndex) continue;
    if (entry.reason !== 'FICHE_REJECTED_REFUND' || entry.amount < 0) continue;
    const meta = metadataObject(entry.metadata);
    const allocations = Array.isArray(meta.allocations) ? meta.allocations : null;
    let accepted = 0;
    if (allocations) {
      for (const raw of allocations) {
        const allocation = metadataObject(raw);
        const debit = remaining.get(String(allocation.debitId));
        const amount = allocation.amount;
        if (!debit || debit.entry.createdAt > entry.createdAt || !TECHNICAL_REASONS.has(debit.entry.reason) || typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0 || amount > debit.amount || accepted + amount > entry.amount) {
          anomalies.push(`INVALID_REFUND:${entry.id}`); continue;
        }
        debit.amount -= amount; accepted += amount;
      }
    } else if (meta.source === 'SHOP_REROLL_FT') {
      // Historical automatic rerolls only. Manual grants/notes are never converted
      // into refund rights. Preserve bounded historical refunds without minting XP.
      for (const debit of remaining.values()) {
        if (!TECHNICAL_REASONS.has(debit.entry.reason) || debit.entry.createdAt >= entry.createdAt) continue;
        const amount = Math.min(debit.amount, entry.amount - accepted);
        debit.amount -= amount; accepted += amount;
        if (accepted === entry.amount) break;
      }
    }
    refunds += accepted;
    if (accepted !== entry.amount) anomalies.push(`UNALLOCATED_REFUND:${entry.id}`);
  }
  let incoming = 0, outgoing = 0, reserved = 0;
  for (const trade of trades) {
    const initiator = trade.initiatorId === userId;
    const sent = initiator ? trade.initiatorXpOffered : trade.recipientXpOffered;
    const received = initiator ? trade.recipientXpOffered : trade.initiatorXpOffered;
    if (trade.status === 'ACCEPTED') { incoming += received; outgoing += sent; }
    else if (['REQUESTED', 'NEGOTIATING', 'FINAL_PENDING'].includes(trade.status)) reserved += sent;
  }
  const spent = [...remaining.values()].reduce((sum, debit) => sum + debit.amount, 0);
  const source = Math.max(0, forumXp ?? 0);
  const budget = source + incoming - outgoing;
  const rawAvailable = budget - spent - reserved;
  return {
    forumXp: source, linked: forumXp !== null, budget, incoming, outgoing, reserved, spent, refunds,
    available: Math.max(0, rawAvailable), deficit: Math.max(0, -rawAvailable), anomalies,
    baselineApplied: baselineIndex >= 0,
    outstanding: [...remaining.values()].filter(debit => debit.amount > 0),
  };
}
