import { ARTS, ARTS_ALL, EXPERTISE_COSTS, KUCHIYOSE_UNLOCK_COST, SPEC_RANK_COST, getArtState, rankIndex, type ArtsState } from '@/lib/arts';
import { metadataObject, type EconomyEntry } from '@/lib/economy';

type Outstanding = { entry: EconomyEntry; amount: number };
type Allocation = { debitId: string; amount: number };

/** Only payments backing arts still present on the character can be returned. */
export function eligibleArtAllocations(outstanding: Outstanding[], state: ArtsState | null): Allocation[] {
  const quotas = new Map<string, number>();
  const used = new Set<string>();
  const allocations: Allocation[] = [];
  const payments = outstanding.filter(({ entry }) => entry.reason === 'ARTS_SPEND')
    .sort((a, b) => b.entry.createdAt.getTime() - a.entry.createdAt.getTime() || b.entry.id.localeCompare(a.entry.id));

  for (const { entry, amount } of payments) {
    const meta = metadataObject(entry.metadata);
    const action = meta.type;
    const art = meta.art;
    let eligible = 0;
    if (action === 'rankSpec' && typeof art === 'string' && ARTS_ALL.some(def => def.key === art) &&
        typeof meta.spec === 'number' && Number.isInteger(meta.spec) && meta.spec >= 0 && meta.spec <= 2) {
      const current = getArtState(state, art);
      if (current.primarySpec === meta.spec) continue;
      const key = `${art}:${meta.spec}`;
      const quota = quotas.get(key) ?? rankIndex(current.specs?.[meta.spec]) * SPEC_RANK_COST;
      eligible = Math.min(amount, quota, SPEC_RANK_COST);
      quotas.set(key, quota - eligible);
    } else if (action === 'expertise' && typeof art === 'string' && ARTS.some(def => def.key === art)) {
      const key = `expertise:${art}`;
      if (getArtState(state, art).expertised && !used.has(key)) {
        eligible = Math.min(amount, EXPERTISE_COSTS[EXPERTISE_COSTS.length - 1]);
        used.add(key);
      }
    } else if (action === 'unlockKuchiyose') {
      if (getArtState(state, 'kuchiyose').unlocked && !used.has('unlockKuchiyose')) {
        eligible = Math.min(amount, KUCHIYOSE_UNLOCK_COST);
        used.add('unlockKuchiyose');
      }
    }
    if (eligible > 0) allocations.push({ debitId: entry.id, amount: eligible });
  }
  return allocations;
}
