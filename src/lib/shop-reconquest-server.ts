import { prisma } from "@/lib/prisma";

export const SHOP_RECONQUEST_STATE_KEY = "reconquest_progress";

export async function loadReconquestProgress(): Promise<number> {
  const state = await prisma.shopState.findUnique({
    where: { key: SHOP_RECONQUEST_STATE_KEY },
    select: { intValue: true },
  });

  if (state) return state.intValue;

  const legacyCount = await prisma.inventoryItem.aggregate({
    where: { itemKey: { startsWith: "reconquete-contree-" } },
    _sum: { quantity: true },
  });
  return legacyCount._sum.quantity ?? 0;
}
