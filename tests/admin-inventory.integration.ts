/** Uses a private, temporary PostgreSQL schema; never changes application records.
 * Run: npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script --output tests/.inventory-test-schema.sql
 *      node --import tsx tests/admin-inventory.integration.ts
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync, rmSync } from "node:fs";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";
import { adminInventoryAddSchema, adminInventoryUpdateSchema } from "../src/lib/admin-inventory";

loadEnvConfig(process.cwd());

async function main() {
  const schema = `audit_inventory_${randomUUID().replaceAll("-", "")}`;
  assert.match(schema, /^audit_inventory_[a-f0-9]{32}$/);
  const url = new URL(process.env.DATABASE_URL!);
  const admin = new PrismaClient({ datasourceUrl: url.toString() });
  url.searchParams.set("schema", schema);
  const db = new PrismaClient({ datasourceUrl: url.toString() });
  let created = false;
  let passed = 0;
  async function check(name: string, run: () => Promise<void> | void) {
    await run(); passed++; console.log(`PASS ${name}`);
  }
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`); created = true;
    const sql = readFileSync("tests/.inventory-test-schema.sql", "utf8").replace('CREATE SCHEMA IF NOT EXISTS "public";', "");
    assert.ok(!sql.includes('"public".'));
    await admin.$transaction(async tx => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      for (const statement of sql.split(";").filter(s => s.trim())) await tx.$executeRawUnsafe(statement);
    }, { timeout: 60000 });
    const location = await db.$queryRaw<Array<{ current_schema: string }>>`SELECT current_schema()`;
    assert.equal(location[0].current_schema, schema);
    (globalThis as unknown as { prisma: PrismaClient }).prisma = db;
    const { addAdminInventory: add, updateAdminInventory: update } = await import("../src/lib/admin-inventory-server");
    const user = await db.user.create({ data: { email: "inventory@example.invalid", username: "Inventory test", passwordHash: "not-a-login", xpAvailable: 100 } });
    const other = await db.user.create({ data: { email: "other@example.invalid", username: "Other test", passwordHash: "not-a-login" } });
    for (const [itemKey, category, stock] of [["kunai", "OUTILS_SHINOBI", "UNLIMITED"], ["relic", "RELIQUES", "UNIQUE"], ["tool", "OUTILS_SHINOBI", "UNIQUE"]]) {
      await db.shopCatalogItem.create({ data: { itemKey, name: itemKey, category, stock, costXp: 50, kanji: "具", description: "Test", effect: "Test" } });
    }
    const grant = (itemKey: string, quantity = 1, userId = user.id) => add(userId, { source: "catalog", itemKey, quantity });
    await check("reject malformed, fractional, negative and excessive quantities", () => {
      for (const quantity of [0, -1, 1.5, 1000000, "2", null]) assert.equal(adminInventoryAddSchema.safeParse({ source: "catalog", itemKey: "kunai", quantity }).success, false);
      assert.equal(adminInventoryAddSchema.safeParse({ source: "custom", itemName: "   ", quantity: 1 }).success, false);
      assert.equal(adminInventoryUpdateSchema.safeParse({ quantity: 1 }).success, false);
    });
    await check("catalog grants merge without spending XP", async () => {
      await grant("kunai", 3); const item = await grant("kunai", 2);
      assert.equal(item.quantity, 5);
      assert.equal((await db.user.findUniqueOrThrow({ where: { id: user.id } })).xpAvailable, 100);
      assert.equal(await db.xPTransaction.count(), 0);
    });
    const owned = await db.inventoryItem.findUniqueOrThrow({ where: { userId_itemKey: { userId: user.id, itemKey: "kunai" } } });
    await check("custom objects can be granted, adjusted and deleted", async () => {
      const item = await add(user.id, { source: "custom", itemName: "Médaille", quantity: 2 });
      assert.equal(item.costXp, 0);
      await update(user.id, item.id, { quantity: 4, expectedQuantity: 2 });
      await update(user.id, item.id, { quantity: 0, expectedQuantity: 4 });
      assert.equal(await db.inventoryItem.findUnique({ where: { id: item.id } }), null);
    });
    await check("reserved units survive removal of available units", async () => {
      await db.inventoryItem.update({ where: { id: owned.id }, data: { reservedQuantity: 2 } });
      await assert.rejects(update(user.id, owned.id, { quantity: 1, expectedQuantity: 5 }), /INVENTORY_RESERVED/);
      await assert.rejects(update(user.id, owned.id, { quantity: 0, expectedQuantity: 5 }), /INVENTORY_RESERVED/);
      await update(user.id, owned.id, { quantity: 2, expectedQuantity: 5 });
      assert.equal((await db.inventoryItem.findUniqueOrThrow({ where: { id: owned.id } })).reservedQuantity, 2);
    });
    await check("stale edits and another player's item are rejected", async () => {
      await assert.rejects(update(user.id, owned.id, { quantity: 9, expectedQuantity: 5 }), /CONFLICT/);
      await assert.rejects(update(other.id, owned.id, { quantity: 0, expectedQuantity: 2 }), /NOT_FOUND/);
    });
    await check("unique objects cannot be duplicated through grant or edit", async () => {
      const item = await grant("tool");
      await assert.rejects(grant("tool"), /DUPLICATE/);
      await assert.rejects(update(user.id, item.id, { quantity: 2, expectedQuantity: 1 }), /DUPLICATE/);
      await assert.rejects(grant("relic", 2), /DUPLICATE/);
    });
    await check("simultaneous global unique grants have exactly one winner", async () => {
      const results = await Promise.allSettled([grant("relic"), grant("relic", 1, other.id)]);
      assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
      assert.equal(await db.inventoryItem.count({ where: { itemKey: "relic" } }), 1);
    });
    await check("concurrent grants do not lose quantities", async () => {
      await Promise.all([grant("kunai", 2), grant("kunai", 3)]);
      assert.equal((await db.inventoryItem.findUniqueOrThrow({ where: { id: owned.id } })).quantity, 7);
    });
    await check("concurrent edits cannot overwrite each other", async () => {
      const results = await Promise.allSettled([update(user.id, owned.id, { quantity: 8, expectedQuantity: 7 }), update(user.id, owned.id, { quantity: 9, expectedQuantity: 7 })]);
      assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
    });
    await check("missing players and inactive catalog objects cannot be granted", async () => {
      await assert.rejects(grant("kunai", 1, "missing"), /NOT_FOUND/);
      await db.shopCatalogItem.update({ where: { itemKey: "kunai" }, data: { isActive: false } });
      await assert.rejects(grant("kunai"), /NOT_FOUND/);
    });
    console.log(`${passed} inventory integration checks passed.`);
  } finally {
    await db.$disconnect();
    if (created) await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.$disconnect();
    rmSync("tests/.inventory-test-schema.sql", { force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
