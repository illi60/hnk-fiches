import { economyTransaction } from '@/lib/economy-server';
import { ECONOMY_ADMIN_ADJUSTMENT_SOURCE, metadataObject } from '@/lib/economy';

export async function adjustAdminXp(actorId: string, input: { userId: string; amount: number; note: string; operationId: string }) {
  const { userId, amount, note, operationId } = input;
  return economyTransaction([userId], async tx => {
    const previous = await tx.xPTransaction.findFirst({ where: {
      userId, metadata: { path: ['operationId'], equals: operationId },
    } });
    if (previous) {
      const metadata = metadataObject(previous.metadata);
      if (previous.actorId !== actorId || previous.amount !== amount || metadata.note !== note || metadata.source !== ECONOMY_ADMIN_ADJUSTMENT_SOURCE) throw new Error('CONFLICT');
      return;
    }
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    if (user.characterStatus === 'DEAD_MISSING') throw new Error('CHARACTER_FROZEN');
    if (user.xpAvailable + amount < 0) throw new Error('INSUFFICIENT_XP');
    if (user.xpAvailable + amount > 2147483647) throw new Error('INVALID_STATE');
    await tx.user.update({ where: { id: userId }, data: {
      xpAvailable: { increment: amount }, version: { increment: 1 },
    } });
    await tx.xPTransaction.create({ data: {
      userId, actorId, amount, reason: amount > 0 ? 'ADMIN_GRANT' : 'ADMIN_REMOVE',
      metadata: { source: ECONOMY_ADMIN_ADJUSTMENT_SOURCE, operationId, note },
    } });
  }, { recovery: true });
}
