import { NextResponse } from "next/server";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminInventoryAddSchema } from "@/lib/admin-inventory";
import { addAdminInventory } from "@/lib/admin-inventory-server";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const parsed = adminInventoryAddSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    const item = await addAdminInventory(id, parsed.data);
    return NextResponse.json({ ok: true, item });
  } catch (error) {
    return jsonError(error);
  }
}
