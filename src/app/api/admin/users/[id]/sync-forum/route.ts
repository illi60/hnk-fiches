import { NextResponse } from "next/server";

import { requireAdmin, jsonError } from "@/lib/permissions";
import { syncUserFromForum } from "@/lib/forum-sync";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/admin/users/[id]/sync-forum — déclenche manuellement la sync
// pour un seul utilisateur (utile depuis le panel ForumLinkPanel).
// Anti-spam : 5 syncs/minute par utilisateur ciblé (protège le forum FA).
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const rl = rateLimit(`sync-forum:${id}`, 5, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { ok: false, error: "RATE_LIMITED", resetIn: rl.resetIn },
        { status: 429 }
      );
    }

    const outcome = await syncUserFromForum(id);
    return NextResponse.json(outcome);
  } catch (e) {
    return jsonError(e);
  }
}
