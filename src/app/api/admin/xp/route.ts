import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminXpSchema } from "@/lib/validators";
import { recomputeRanks } from "@/lib/progression-server";

// POST /api/admin/xp — admin crédite ou débite manuellement de l'XP.
//
// Règles (cf. PLAYBOOK §2.2 / §2.3) :
//   - amount peut être négatif (retrait) ou positif (don)
//   - xpTotalEarned n'augmente QUE sur grant positif
//     (sinon retirer ferait perdre des niveaux, ce qui est exclu)
//   - Toujours $transaction + optimistic lock via `version`
//   - Toujours créer une XPTransaction (audit)
export async function POST(req: Request) {
  try {
    const admin = await requireAdmin();

    const body = await req.json().catch(() => null);
    const parsed = adminXpSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });

    const { userId, amount, note } = parsed.data;
    if (amount === 0) return NextResponse.json({ error: "INVALID" }, { status: 400 });

    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, version: true, xpAvailable: true, xpTotalEarned: true },
      });
      if (!target) throw new Error("NOT_FOUND");

      // Si retrait, vérifier qu'on ne descend pas sous 0.
      if (amount < 0 && target.xpAvailable + amount < 0) {
        throw new Error("INSUFFICIENT_XP");
      }

      const data: { xpAvailable: { increment?: number; decrement?: number }; xpTotalEarned?: { increment: number }; version: { increment: number } } =
        amount > 0
          ? {
              xpAvailable: { increment: amount },
              xpTotalEarned: { increment: amount },
              version: { increment: 1 },
            }
          : {
              xpAvailable: { decrement: -amount },
              // xpTotalEarned ne bouge PAS sur un retrait (clé du PLAYBOOK §2.6)
              version: { increment: 1 },
            };

      const updated = await tx.user.updateMany({
        where: { id: userId, version: target.version },
        data,
      });
      if (updated.count === 0) throw new Error("CONFLICT");

      await tx.xPTransaction.create({
        data: {
          userId,
          actorId: admin.id,
          amount,
          reason: amount > 0 ? "ADMIN_GRANT" : "ADMIN_REMOVE",
          metadata: note ? { note } : undefined,
        },
      });

      return await tx.user.findUnique({
        where: { id: userId },
        select: { id: true, xpAvailable: true, xpTotalEarned: true, version: true },
      });
    });

    // Don d'XP positif → recalcule les rangs auto basés sur l'XP. Best-effort.
    if (amount > 0) {
      try {
        await recomputeRanks([userId]);
      } catch (err) {
        console.error("[admin xp] recompute failed", err);
      }
    }

    return NextResponse.json({ user: result });
  } catch (e) {
    return jsonError(e);
  }
}
