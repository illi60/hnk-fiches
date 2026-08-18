import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { requireUser, jsonError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { submitTradeOffer } from "@/lib/trades-server";
import { tradeOfferSchema } from "@/lib/validators";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const rl = rateLimit(`trade-offer:${me.id}`, 12, 60_000);
    if (!rl.ok) return NextResponse.json({ ok: false, error: "RATE_LIMITED" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = tradeOfferSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const { id } = await params;
    const trade = await submitTradeOffer(me.id, id, parsed.data);
    return NextResponse.json({ ok: true, trade });
  } catch (e) {
    console.error("[trade-offer]", e);
    if (process.env.NODE_ENV !== "production") {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        return NextResponse.json(
          {
            ok: false,
            error: "PRISMA_ERROR",
            code: e.code,
            message: e.message,
            meta: e.meta,
          },
          { status: 500 }
        );
      }
      if (e instanceof Error) {
        return NextResponse.json(
          { ok: false, error: e.message || "INTERNAL", message: e.message, name: e.name },
          { status: 500 }
        );
      }
    }
    return jsonError(e);
  }
}
