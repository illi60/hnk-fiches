import { prisma } from "@/lib/prisma";

let hasInvocationRankCache: boolean | null = null;

export async function hasInvocationRankColumn(): Promise<boolean> {
  if (hasInvocationRankCache !== null) return hasInvocationRankCache;
  try {
    const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
      select exists (
        select 1
        from information_schema.columns
        where table_name = 'Invocation'
          and column_name = 'invocationRank'
      ) as "exists"
    `;
    hasInvocationRankCache = !!rows[0]?.exists;
  } catch {
    hasInvocationRankCache = false;
  }
  return hasInvocationRankCache;
}

