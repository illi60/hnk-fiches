import { NextResponse } from 'next/server';
import { requireAdmin, jsonError } from '@/lib/permissions';
import { shopRerollFtSchema } from '@/lib/validators';
import { resetTechniques } from '@/lib/technical-reset-server';

export async function POST(req: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    const admin = await requireAdmin();
    const {id} = await params;
    const parsed = shopRerollFtSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({error: 'INVALID'}, {status: 400});
    return NextResponse.json({ok: true, result: await resetTechniques(id, parsed.data.operationId, admin.id)});
  } catch (error) { return jsonError(error); }
}
