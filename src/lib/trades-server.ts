import { Prisma, type TradeSide } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { loadShopItemsByKeys } from "@/lib/shop-server";
import { isTradeableShopItem, type ShopItem } from "@/lib/shop";

export type TradeLineInput = {
  itemKey: string;
  quantity: number;
};

export type TradeListItem = Prisma.TradeGetPayload<{
  include: {
    initiator: { select: { id: true; username: true; forumAvatar: true } };
    recipient: { select: { id: true; username: true; forumAvatar: true } };
    items: true;
    messages: {
      include: { author: { select: { id: true; username: true; forumAvatar: true } } };
    };
  };
}>;

const TRADE_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const TRADE_INCLUDE = {
  initiator: { select: { id: true, username: true, forumAvatar: true } },
  recipient: { select: { id: true, username: true, forumAvatar: true } },
  items: { orderBy: [{ side: "asc" as const }, { itemName: "asc" as const }] },
  messages: {
    orderBy: { createdAt: "asc" as const },
    include: { author: { select: { id: true, username: true, forumAvatar: true } } },
  },
};
const TRADE_INCLUDE_LEGACY = {
  initiator: { select: { id: true, username: true, forumAvatar: true } },
  recipient: { select: { id: true, username: true, forumAvatar: true } },
  items: { orderBy: [{ side: "asc" as const }, { itemName: "asc" as const }] },
};

function isMissingTradeSchema(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ((error as { code?: string }).code === "P2021" || (error as { code?: string }).code === "P2022")
  );
}

export async function isTradesSchemaReady(): Promise<boolean> {
  try {
    await prisma.trade.findFirst({ select: { id: true } });
    return true;
  } catch (error) {
    if (isMissingTradeSchema(error)) return false;
    throw error;
  }
}

async function isTradeMessageSchemaReady(): Promise<boolean> {
  try {
    await prisma.tradeMessage.findFirst({ select: { id: true } });
    return true;
  } catch (error) {
    if (isMissingTradeSchema(error)) return false;
    throw error;
  }
}

async function tradeInclude(): Promise<Prisma.TradeInclude> {
  return (await isTradeMessageSchemaReady()) ? TRADE_INCLUDE : TRADE_INCLUDE_LEGACY;
}

function withMessages<T extends { messages?: unknown[] }>(trade: T): T & { messages: NonNullable<T["messages"]> } {
  return { ...trade, messages: (trade.messages ?? []) as NonNullable<T["messages"]> };
}

function normalizeLines(lines: TradeLineInput[]): TradeLineInput[] {
  const byKey = new Map<string, number>();
  for (const line of lines) {
    byKey.set(line.itemKey, (byKey.get(line.itemKey) ?? 0) + line.quantity);
  }
  return Array.from(byKey.entries()).map(([itemKey, quantity]) => ({ itemKey, quantity }));
}

async function loadTradeableCatalog(itemKeys: string[]) {
  const keys = Array.from(new Set(itemKeys));
  if (keys.length === 0) return new Map<string, ShopItem>();

  const items = await loadShopItemsByKeys(keys);
  const byKey = new Map(items.map((item) => [item.key, item]));
  for (const itemKey of keys) {
    const item = byKey.get(itemKey);
    if (!item || !isTradeableShopItem(item)) throw new Error("TRADE_ITEM_NOT_TRADEABLE");
  }
  return byKey;
}

function sideForUser(trade: { initiatorId: string; recipientId: string }, userId: string): TradeSide {
  if (trade.initiatorId === userId) return "INITIATOR";
  if (trade.recipientId === userId) return "RECIPIENT";
  throw new Error("TRADE_FORBIDDEN");
}

function xpField(side: TradeSide): "initiatorXpOffered" | "recipientXpOffered" {
  return side === "INITIATOR" ? "initiatorXpOffered" : "recipientXpOffered";
}

function submittedField(side: TradeSide): "initiatorSubmitted" | "recipientSubmitted" {
  return side === "INITIATOR" ? "initiatorSubmitted" : "recipientSubmitted";
}

function finalField(side: TradeSide): "initiatorFinalAccepted" | "recipientFinalAccepted" {
  return side === "INITIATOR" ? "initiatorFinalAccepted" : "recipientFinalAccepted";
}

async function reserveLines(tx: Prisma.TransactionClient, userId: string, lines: TradeLineInput[]) {
  for (const line of lines) {
    const owned = await tx.inventoryItem.findUnique({
      where: { userId_itemKey: { userId, itemKey: line.itemKey } },
      select: { id: true, quantity: true, reservedQuantity: true },
    });
    if (!owned || owned.quantity - owned.reservedQuantity < line.quantity) {
      throw new Error("TRADE_ITEM_UNAVAILABLE");
    }
    const updated = await tx.inventoryItem.updateMany({
      where: { id: owned.id, reservedQuantity: { lte: owned.quantity - line.quantity } },
      data: { reservedQuantity: { increment: line.quantity } },
    });
    if (updated.count === 0) throw new Error("TRADE_ITEM_UNAVAILABLE");
  }
}

async function releaseLines(tx: Prisma.TransactionClient, userId: string, lines: TradeLineInput[]) {
  for (const line of lines) {
    const owned = await tx.inventoryItem.findUnique({
      where: { userId_itemKey: { userId, itemKey: line.itemKey } },
      select: { id: true, reservedQuantity: true },
    });
    if (!owned) continue;
    await tx.inventoryItem.update({
      where: { id: owned.id },
      data: { reservedQuantity: { decrement: Math.min(owned.reservedQuantity, line.quantity) } },
    });
  }
}

async function reserveXp(tx: Prisma.TransactionClient, userId: string, tradeId: string, amount: number) {
  if (amount <= 0) return;
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, xpAvailable: true, version: true },
  });
  if (!user || user.xpAvailable < amount) throw new Error("INSUFFICIENT_XP");
  const updated = await tx.user.updateMany({
    where: { id: user.id, version: user.version },
    data: { xpAvailable: { decrement: amount }, version: { increment: 1 } },
  });
  if (updated.count === 0) throw new Error("CONFLICT");
  await tx.xPTransaction.create({
    data: {
      userId,
      amount: -amount,
      reason: "SHOP_SPEND",
      metadata: { tradeId, tradeReason: "TRADE_RESERVE" } as Prisma.InputJsonValue,
    },
  });
}

async function releaseXp(tx: Prisma.TransactionClient, userId: string, tradeId: string, amount: number) {
  if (amount <= 0) return;
  await tx.user.update({
    where: { id: userId },
    data: { xpAvailable: { increment: amount }, version: { increment: 1 } },
  });
  await tx.xPTransaction.create({
    data: {
      userId,
      amount,
      reason: "SHOP_SPEND",
      metadata: { tradeId, tradeReason: "TRADE_RELEASE" } as Prisma.InputJsonValue,
    },
  });
}

async function transferReservedXp(
  tx: Prisma.TransactionClient,
  fromUserId: string,
  toUserId: string,
  tradeId: string,
  amount: number
) {
  if (amount <= 0) return;
  await tx.user.update({
    where: { id: toUserId },
    data: { xpAvailable: { increment: amount }, version: { increment: 1 } },
  });
  await tx.xPTransaction.create({
    data: {
      userId: toUserId,
      actorId: fromUserId,
      amount,
      reason: "SHOP_SPEND",
      metadata: { tradeId, fromUserId } as Prisma.InputJsonValue,
    },
  });
}

async function transferLine(
  tx: Prisma.TransactionClient,
  fromUserId: string,
  toUserId: string,
  line: { itemKey: string; itemName: string; costXp: number; quantity: number }
) {
  const owned = await tx.inventoryItem.findUnique({
    where: { userId_itemKey: { userId: fromUserId, itemKey: line.itemKey } },
    select: { id: true, quantity: true, reservedQuantity: true },
  });
  if (!owned || owned.reservedQuantity < line.quantity || owned.quantity < line.quantity) {
    throw new Error("TRADE_ITEM_UNAVAILABLE");
  }

  const nextQuantity = owned.quantity - line.quantity;
  const nextReservedQuantity = owned.reservedQuantity - line.quantity;
  const updated = await tx.inventoryItem.updateMany({
    where: { id: owned.id, quantity: { gte: line.quantity }, reservedQuantity: { gte: line.quantity } },
    data: { quantity: nextQuantity, reservedQuantity: nextReservedQuantity },
  });
  if (updated.count === 0) throw new Error("TRADE_ITEM_UNAVAILABLE");
  if (nextQuantity <= 0 && nextReservedQuantity <= 0) {
    await tx.inventoryItem.delete({ where: { id: owned.id } });
  }

  await tx.inventoryItem.upsert({
    where: { userId_itemKey: { userId: toUserId, itemKey: line.itemKey } },
    create: {
      userId: toUserId,
      itemKey: line.itemKey,
      itemName: line.itemName,
      costXp: line.costXp,
      quantity: line.quantity,
    },
    update: {
      itemName: line.itemName,
      costXp: line.costXp,
      quantity: { increment: line.quantity },
    },
  });
}

function tradeLines(trade: { items: Array<{ side: TradeSide; itemKey: string; quantity: number }> }, side: TradeSide) {
  return trade.items.filter((item) => item.side === side).map((item) => ({ itemKey: item.itemKey, quantity: item.quantity }));
}

function sideHasValue(
  trade: { items: Array<{ side: TradeSide; quantity: number }>; initiatorXpOffered: number; recipientXpOffered: number },
  side: TradeSide
) {
  return trade.items.some((item) => item.side === side && item.quantity > 0) || trade[xpField(side)] > 0;
}

export async function listUserTrades(userId: string): Promise<TradeListItem[]> {
  try {
    const include = await tradeInclude();
    const trades = await prisma.trade.findMany({
      where: { OR: [{ initiatorId: userId }, { recipientId: userId }] },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include,
    });
    return trades.map((trade) => withMessages(trade)) as unknown as TradeListItem[];
  } catch (error) {
    if (isMissingTradeSchema(error)) return [];
    throw error;
  }
}

export async function createTrade({
  initiatorId,
  recipientId,
  message,
}: {
  initiatorId: string;
  recipientId: string;
  message: string;
}) {
  if (initiatorId === recipientId) throw new Error("TRADE_FORBIDDEN");
  const [initiator, recipient] = await Promise.all([
    prisma.user.findUnique({
      where: { id: initiatorId },
      select: { id: true, role: true },
    }),
    prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true },
    }),
  ]);
  if (!initiator || !recipient) throw new Error("TRADE_NOT_FOUND");
  if (initiator.role !== "ADMIN") throw new Error("TRADE_FORBIDDEN");

  const include = await tradeInclude();
  const trade = await prisma.trade.create({
    data: {
      initiatorId,
      recipientId,
      requestMessage: message.trim(),
      expiresAt: new Date(Date.now() + TRADE_TTL_MS),
    },
    include,
  });
  return withMessages(trade);
}

export async function acceptTradeStep(userId: string, tradeId: string) {
  const include = await tradeInclude();
  const trade = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`hnk_trade_${tradeId}`}))`;
    const trade = await tx.trade.findUnique({ where: { id: tradeId }, include: { items: true } });
    if (!trade) throw new Error("TRADE_NOT_FOUND");
    const side = sideForUser(trade, userId);
    if (trade.expiresAt && trade.expiresAt < new Date()) throw new Error("TRADE_INVALID_STATE");

    if (trade.status === "REQUESTED") {
      if (side !== "RECIPIENT") throw new Error("TRADE_FORBIDDEN");
      return tx.trade.update({
        where: { id: trade.id },
        data: { status: "NEGOTIATING" },
        include,
      });
    }

    if (trade.status !== "FINAL_PENDING") throw new Error("TRADE_INVALID_STATE");
    const data = { [finalField(side)]: true };
    const initiatorAccepted = side === "INITIATOR" ? true : trade.initiatorFinalAccepted;
    const recipientAccepted = side === "RECIPIENT" ? true : trade.recipientFinalAccepted;
    if (!initiatorAccepted || !recipientAccepted) {
      return tx.trade.update({ where: { id: trade.id }, data, include });
    }

    for (const line of trade.items.filter((item) => item.side === "INITIATOR")) {
      await transferLine(tx, trade.initiatorId, trade.recipientId, line);
    }
    for (const line of trade.items.filter((item) => item.side === "RECIPIENT")) {
      await transferLine(tx, trade.recipientId, trade.initiatorId, line);
    }
    await transferReservedXp(tx, trade.initiatorId, trade.recipientId, trade.id, trade.initiatorXpOffered);
    await transferReservedXp(tx, trade.recipientId, trade.initiatorId, trade.id, trade.recipientXpOffered);

    return tx.trade.update({
      where: { id: trade.id },
      data: { ...data, status: "ACCEPTED", acceptedAt: new Date() },
      include,
    });
  });
  return withMessages(trade);
}

export async function submitTradeOffer(userId: string, tradeId: string, input: { items: TradeLineInput[]; xp: number }) {
  const lines = normalizeLines(input.items);
  const catalogByKey = await loadTradeableCatalog(lines.map((line) => line.itemKey));
  const include = await tradeInclude();

  const trade = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`hnk_trade_${tradeId}`}))`;
    const trade = await tx.trade.findUnique({ where: { id: tradeId }, include: { items: true } });
    if (!trade) throw new Error("TRADE_NOT_FOUND");
    const side = sideForUser(trade, userId);
    if (trade.status !== "NEGOTIATING" && trade.status !== "FINAL_PENDING") throw new Error("TRADE_INVALID_STATE");
    const hasOfferValue = lines.length > 0 || input.xp > 0;
    const otherSide = side === "INITIATOR" ? "RECIPIENT" : "INITIATOR";
    if (!hasOfferValue && !sideHasValue(trade, otherSide)) throw new Error("TRADE_EMPTY");

    const oldLines = tradeLines(trade, side);
    const oldXp = trade[xpField(side)];
    await releaseLines(tx, userId, oldLines);
    if (input.xp < oldXp) await releaseXp(tx, userId, trade.id, oldXp - input.xp);

    await reserveLines(tx, userId, lines);
    if (input.xp > oldXp) await reserveXp(tx, userId, trade.id, input.xp - oldXp);

    await tx.tradeItem.deleteMany({ where: { tradeId: trade.id, side } });
    const ownedRows = await tx.inventoryItem.findMany({
      where: { userId, itemKey: { in: lines.map((line) => line.itemKey) } },
      select: { itemKey: true, itemName: true, costXp: true },
    });
    const ownedByKey = new Map(ownedRows.map((row) => [row.itemKey, row]));
    const createdItems = await tx.tradeItem.createMany({
      data: lines.map((line) => {
        const owned = ownedByKey.get(line.itemKey);
        const catalog = catalogByKey.get(line.itemKey);
        return {
          tradeId: trade.id,
          side,
          ownerId: userId,
          itemKey: line.itemKey,
          itemName: owned?.itemName ?? catalog?.name ?? line.itemKey,
          costXp: owned?.costXp ?? catalog?.costXp ?? 0,
          quantity: line.quantity,
        };
      }),
    });
    if (createdItems.count !== lines.length) throw new Error("CONFLICT");

    const nextInitiatorSubmitted = side === "INITIATOR" ? true : trade.initiatorSubmitted;
    const nextRecipientSubmitted = side === "RECIPIENT" ? true : trade.recipientSubmitted;
    return tx.trade.update({
      where: { id: trade.id },
      data: {
        [xpField(side)]: input.xp,
        [submittedField(side)]: true,
        initiatorFinalAccepted: false,
        recipientFinalAccepted: false,
        status: nextInitiatorSubmitted && nextRecipientSubmitted ? "FINAL_PENDING" : "NEGOTIATING",
      },
      include,
    });
  });
  return withMessages(trade);
}

async function releaseTradeReservations(tx: Prisma.TransactionClient, trade: Prisma.TradeGetPayload<{ include: { items: true } }>) {
  await releaseLines(tx, trade.initiatorId, tradeLines(trade, "INITIATOR"));
  await releaseLines(tx, trade.recipientId, tradeLines(trade, "RECIPIENT"));
  await releaseXp(tx, trade.initiatorId, trade.id, trade.initiatorXpOffered);
  await releaseXp(tx, trade.recipientId, trade.id, trade.recipientXpOffered);
}

export async function cancelTrade(userId: string, tradeId: string) {
  const include = await tradeInclude();
  const trade = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`hnk_trade_${tradeId}`}))`;
    const trade = await tx.trade.findUnique({ where: { id: tradeId }, include: { items: true } });
    if (!trade) throw new Error("TRADE_NOT_FOUND");
    sideForUser(trade, userId);
    if (!["REQUESTED", "NEGOTIATING", "FINAL_PENDING"].includes(trade.status)) throw new Error("TRADE_INVALID_STATE");
    await releaseTradeReservations(tx, trade);
    return tx.trade.update({
      where: { id: trade.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
      include,
    });
  });
  return withMessages(trade);
}

export async function declineTrade(userId: string, tradeId: string) {
  const include = await tradeInclude();
  const trade = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`hnk_trade_${tradeId}`}))`;
    const trade = await tx.trade.findUnique({ where: { id: tradeId }, include: { items: true } });
    if (!trade) throw new Error("TRADE_NOT_FOUND");
    sideForUser(trade, userId);
    if (!["REQUESTED", "NEGOTIATING", "FINAL_PENDING"].includes(trade.status)) throw new Error("TRADE_INVALID_STATE");
    await releaseTradeReservations(tx, trade);
    return tx.trade.update({
      where: { id: trade.id },
      data: { status: "DECLINED", declinedAt: new Date() },
      include,
    });
  });
  return withMessages(trade);
}

export async function renegotiateTrade(userId: string, tradeId: string) {
  const include = await tradeInclude();
  const trade = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`hnk_trade_${tradeId}`}))`;
    const trade = await tx.trade.findUnique({ where: { id: tradeId }, include: { items: true } });
    if (!trade) throw new Error("TRADE_NOT_FOUND");
    sideForUser(trade, userId);
    if (trade.status !== "FINAL_PENDING") throw new Error("TRADE_INVALID_STATE");

    await releaseTradeReservations(tx, trade);
    await tx.tradeItem.deleteMany({ where: { tradeId: trade.id } });

    return tx.trade.update({
      where: { id: trade.id },
      data: {
        status: "NEGOTIATING",
        initiatorXpOffered: 0,
        recipientXpOffered: 0,
        initiatorSubmitted: false,
        recipientSubmitted: false,
        initiatorFinalAccepted: false,
        recipientFinalAccepted: false,
      },
      include,
    });
  });
  return withMessages(trade);
}

export async function deleteCancelledTrade(userId: string, tradeId: string) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`hnk_trade_${tradeId}`}))`;
    const trade = await tx.trade.findUnique({ where: { id: tradeId }, select: { id: true, initiatorId: true, recipientId: true, status: true } });
    if (!trade) throw new Error("TRADE_NOT_FOUND");
    sideForUser(trade, userId);
    if (trade.status !== "CANCELLED") throw new Error("TRADE_INVALID_STATE");
    await tx.trade.delete({ where: { id: trade.id } });
    return { id: trade.id };
  });
}

export async function addTradeMessage(userId: string, tradeId: string, body: string) {
  if (!(await isTradeMessageSchemaReady())) throw new Error("TRADE_SCHEMA_NOT_READY");
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`hnk_trade_${tradeId}`}))`;
    const trade = await tx.trade.findUnique({ where: { id: tradeId }, select: { id: true, initiatorId: true, recipientId: true, status: true } });
    if (!trade) throw new Error("TRADE_NOT_FOUND");
    sideForUser(trade, userId);
    if (!["REQUESTED", "NEGOTIATING", "FINAL_PENDING"].includes(trade.status)) throw new Error("TRADE_INVALID_STATE");

    await tx.tradeMessage.create({
      data: {
        tradeId: trade.id,
        authorId: userId,
        body: body.trim(),
      },
    });

    return tx.trade.findUniqueOrThrow({ where: { id: trade.id }, include: TRADE_INCLUDE });
  });
}
