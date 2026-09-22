import { NextResponse } from 'next/server';
import { requireAdmin, jsonError } from '@/lib/permissions';
// Forum is the sole source. Refunds go through the audited reset operation.
export async function POST() {
  try {
    await requireAdmin();
    return NextResponse.json({ error: 'FORUM_XP_ONLY', message: 'Les XP sont pilotés par le forum. Utilisez la synchronisation ou le reset technique audité pour un remboursement.' }, { status: 403 });
  } catch (error) { return jsonError(error); }
}
