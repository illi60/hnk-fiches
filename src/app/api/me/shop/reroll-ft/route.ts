import { NextResponse } from 'next/server';
import { requireUser, jsonError } from '@/lib/permissions';
import { rateLimit } from '@/lib/rate-limit';
import { shopRerollFtSchema } from '@/lib/validators';
import { resetTechniques } from '@/lib/technical-reset-server';
export async function POST(req: Request) {
  try {
    const me = await requireUser();
    if (!rateLimit('shop-reroll-ft:' + me.id, 4, 60000).ok) return NextResponse.json({error: 'RATE_LIMITED'}, {status: 429});
    const parsed = shopRerollFtSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({error: 'INVALID'}, {status: 400});
    const result = await resetTechniques(me.id, parsed.data.operationId);
    return NextResponse.json({ok: true, ...(result as object)});
  } catch (error) { return jsonError(error); }
}
