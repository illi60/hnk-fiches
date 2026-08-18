import { NextResponse } from "next/server";

import { requireUser, jsonError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { createTrade, isTradesSchemaReady, listUserTrades } from "@/lib/trades-server";
import { tradeCreateSchema } from "@/lib/validators";

export async function GET() {
  try {
    const me = await requireUser();
    const trades = await listUserTrades(me.id);
    return NextResponse.json({ ok: true, trades });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const me = await requireUser();
    const rl = rateLimit(`trades:${me.id}`, 8, 60_000);
    if (!rl.ok) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = tradeCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });
    if (!(await isTradesSchemaReady())) throw new Error("TRADE_SCHEMA_NOT_READY");

    const trade = await createTrade({
      initiatorId: me.id,
      recipientId: parsed.data.recipientId,
      message: parsed.data.message,
    });

    return NextResponse.json({ ok: true, trade });
  } catch (e) {
    return jsonError(e);
  }
}
