import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { isFounderClan, playableClanKey } from "@/lib/clans";

export async function DELETE(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  try {
    await requireAdmin();
    const { key } = await params;
    const decoded = decodeURIComponent(key);
    const clanKey = playableClanKey(decoded);
    if (!clanKey) return NextResponse.json({ ok: false, error: "INVALID_CLAN" }, { status: 400 });
    if (isFounderClan(decoded)) {
      return NextResponse.json({ ok: false, error: "FOUNDER_CLAN_PROTECTED" }, { status: 403 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const users = await tx.user.updateMany({
        where: { clan: { equals: decoded, mode: "insensitive" } },
        data: { clan: null, rangClan: null },
      });
      const fiches = await tx.ficheTechnique.updateMany({
        where: {
          isActive: true,
          clan: { equals: decoded, mode: "insensitive" },
          OR: [{ nature: "COLLECTIVE" }, { nature: "KINJUTSU", kinjutsuScope: "CLAN" }],
        },
        data: { isActive: false },
      });
      const permissions = await tx.clanLibraryPermission.deleteMany({ where: { clanKey } });
      const ranks = await tx.communityRank.deleteMany({
        where: { scopeType: "CLAN", scopeKey: clanKey },
      });

      return {
        users: users.count,
        fiches: fiches.count,
        permissions: permissions.count,
        ranks: ranks.count,
      };
    });

    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return jsonError(e);
  }
}
