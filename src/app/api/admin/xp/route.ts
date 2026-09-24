import { NextResponse } from 'next/server';
import { requireAdmin, jsonError } from '@/lib/permissions';
import { z } from 'zod';
import { adjustAdminXp } from '@/lib/admin-xp-server';

const schema = z.object({
  userId: z.string().min(1),
  amount: z.number().int().min(-2147483647).max(2147483647).refine(value => value !== 0),
  note: z.string().trim().min(1).max(500),
  operationId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const actor = await requireAdmin();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: 'INVALID_INPUT' }, { status: 400 });
    await adjustAdminXp(actor.id, parsed.data);
    return NextResponse.json({ ok: true });
  } catch (error) { return jsonError(error); }
}
