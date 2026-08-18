import { NextResponse } from "next/server";

import { requireUser, jsonError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { addTradeMessage } from "@/lib/trades-server";
import { tradeMessageSchema } from "@/lib/validators";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const rl = rateLimit(`trade-message:${me.id}`, 20, 60_000);
    if (!rl.ok) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = tradeMessageSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const { id } = await params;
    const trade = await addTradeMessage(me.id, id, parsed.data.body);
    return NextResponse.json({ ok: true, trade });
  } catch (e) {
    return jsonError(e);
  }
}
