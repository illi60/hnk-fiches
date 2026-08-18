import { NextResponse } from "next/server";

import { requireUser, jsonError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { cancelTrade } from "@/lib/trades-server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const rl = rateLimit(`trade-cancel:${me.id}`, 12, 60_000);
    if (!rl.ok) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

    const { id } = await params;
    const trade = await cancelTrade(me.id, id);
    return NextResponse.json({ ok: true, trade });
  } catch (e) {
    return jsonError(e);
  }
}
