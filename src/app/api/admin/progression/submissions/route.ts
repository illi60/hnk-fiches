import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { condMeta, clanScopeKey, VILLAGE_SCOPE_KEY } from "@/lib/progression";

// GET /api/admin/progression/submissions
// ADMIN : détail des soumissions (validées + en attente) à supprimer manuellement.
//   - ?userId=…                         → conditions INDIVIDUELLES du joueur (3 voies).
//   - ?scopeType=VILLAGE|CLAN&scopeKey= → conditions COMMUNAUTAIRES d'un scope.
// Les conditions AUTO (XP / nb de personnages) n'ont pas de soumission : elles
// n'apparaissent donc pas ici (rien à supprimer à la main).
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const scopeType = searchParams.get("scopeType");

    let where:
      | { userId: string; tier: "INDIVIDUAL"; status: { in: ("PENDING" | "VALIDATED")[] } }
      | { track: "VILLAGE" | "CLAN"; tier: "COMMUNITY"; scopeKey: string; status: { in: ("PENDING" | "VALIDATED")[] } };

    if (userId) {
      where = { userId, tier: "INDIVIDUAL", status: { in: ["PENDING", "VALIDATED"] } };
    } else if (scopeType === "VILLAGE" || scopeType === "CLAN") {
      const scopeKey =
        scopeType === "VILLAGE" ? VILLAGE_SCOPE_KEY : clanScopeKey(searchParams.get("scopeKey"));
      if (!scopeKey) return NextResponse.json({ error: "SCOPE_INVALIDE" }, { status: 400 });
      where = { track: scopeType, tier: "COMMUNITY", scopeKey, status: { in: ["PENDING", "VALIDATED"] } };
    } else {
      return NextResponse.json({ error: "INVALID" }, { status: 400 });
    }

    const rows = await prisma.progressionSubmission.findMany({
      where,
      orderBy: [{ targetRank: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        track: true,
        condId: true,
        targetRank: true,
        status: true,
        rpTitle: true,
        rpUrl: true,
        collaborators: true,
        createdAt: true,
        user: { select: { username: true } },
      },
    });

    const items = rows.map((r) => ({
      id: r.id,
      track: r.track,
      condId: r.condId,
      label: condMeta(r.condId)?.label ?? null,
      targetRank: r.targetRank,
      status: r.status,
      rpTitle: r.rpTitle,
      rpUrl: r.rpUrl,
      collaborators: r.collaborators,
      username: r.user?.username ?? null,
      createdAt: r.createdAt,
    }));

    return NextResponse.json({ ok: true, items });
  } catch (e) {
    return jsonError(e);
  }
}
