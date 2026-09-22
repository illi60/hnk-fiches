import { z } from "zod";

export const MAX_INVENTORY_QUANTITY = 999_999;
const quantity = z.number().int().min(1).max(MAX_INVENTORY_QUANTITY);

export const adminInventoryAddSchema = z.discriminatedUnion("source", [
  z.object({ source: z.literal("catalog"), itemKey: z.string().min(1).max(200), quantity }),
  z.object({ source: z.literal("custom"), itemName: z.string().trim().min(1).max(160), quantity }),
]);
export const adminInventoryUpdateSchema = z.object({
  quantity: z.number().int().min(0).max(MAX_INVENTORY_QUANTITY),
  expectedQuantity: z.number().int().min(0).max(2_147_483_647),
});

export type AdminInventoryAddInput = z.infer<typeof adminInventoryAddSchema>;
export type AdminInventoryUpdateInput = z.infer<typeof adminInventoryUpdateSchema>;
