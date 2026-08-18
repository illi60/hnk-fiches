import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadShopItems, loadShopItemsByKeys } from "@/lib/shop-server";
import { isTradesSchemaReady, listUserTrades } from "@/lib/trades-server";
import TradeBoard from "@/components/TradeBoard";
import TradeTeaser from "@/components/TradeTeaser";

export default async function EchangesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const tradesReady = await isTradesSchemaReady();

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      role: true,
      xpAvailable: true,
    },
  });
  if (!me) redirect("/login");
  if (me.role !== "ADMIN") return <TradeTeaser />;

  const inventoryItems = tradesReady
    ? await prisma.inventoryItem.findMany({
        where: { userId: me.id },
        orderBy: { updatedAt: "desc" },
        select: {
          itemKey: true,
          itemName: true,
          costXp: true,
          quantity: true,
          reservedQuantity: true,
        },
      })
    : await prisma.inventoryItem.findMany({
        where: { userId: me.id },
        orderBy: { updatedAt: "desc" },
        select: {
          itemKey: true,
          itemName: true,
          costXp: true,
          quantity: true,
        },
      });

  const players = await prisma.user.findMany({
    where: { id: { not: me.id } },
    orderBy: { username: "asc" },
    select: {
      id: true,
      username: true,
      forumAvatar: true,
    },
  });

  const trades = tradesReady ? await listUserTrades(me.id) : [];
  const ownedKeys = [
    ...inventoryItems.map((item) => item.itemKey),
    ...trades.flatMap((trade) => trade.items.map((item) => item.itemKey)),
  ];
  const [shopItems, inventoryCatalogItems] = await Promise.all([
    loadShopItems(),
    loadShopItemsByKeys(ownedKeys),
  ]);
  const catalogByKey = new Map(shopItems.map((item) => [item.key, item]));
  for (const item of inventoryCatalogItems) catalogByKey.set(item.key, item);

  return (
    <TradeBoard
      meId={me.id}
      xpAvailable={me.xpAvailable}
      myInventory={inventoryItems}
      players={players}
      tradesReady={tradesReady}
      trades={trades.map((trade) => ({
        ...trade,
        createdAt: trade.createdAt.toISOString(),
        updatedAt: trade.updatedAt.toISOString(),
        expiresAt: trade.expiresAt?.toISOString() ?? null,
        acceptedAt: trade.acceptedAt?.toISOString() ?? null,
        declinedAt: trade.declinedAt?.toISOString() ?? null,
        cancelledAt: trade.cancelledAt?.toISOString() ?? null,
      }))}
      catalog={Array.from(catalogByKey.values())}
    />
  );
}
