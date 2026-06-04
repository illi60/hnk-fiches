import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { RANKS, rankIndex } from "@/lib/arts";

// POST /api/fiches/[id]/submit — soumet un DRAFT à modération (→ PENDING).
//
// PAS de débit d'XP ici : l'XP sera débitée à la VALIDATION par l'admin
// (cf. /api/admin/fiches). Soumettre est gratuit pour éviter de bloquer
// l'écriture RP.
//
// Cas TYPE D'ACTION COLLECTIVE : la fiche cite des partenaires (pseudos exacts).
//   - Rang Clan < B → 2 partenaires requis (trio).
//   - Rang Clan ≥ B → 1 partenaire suffit (duo), 2 max.
//   - Si un pseudo est introuvable → la fiche est AUTO-REFUSÉE (REJECTED).
//   - Sinon on résout les IDs (collaboratorIds) et on passe en PENDING.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const me = await requireUser();
    const { id } = await params;

    const rl = rateLimit(`fiche-submit:${me.id}`, 30, 60 * 60_000);
    if (!rl.ok) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

    const fiche = await prisma.ficheTechnique.findUnique({
      where: { id },
      select: {
        id: true,
        authorId: true,
        status: true,
        isActive: true,
        actionType: true,
        collaborators: true,
      },
    });
    if (!fiche || !fiche.isActive || fiche.authorId !== me.id) {
      return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
    }
    if (fiche.status !== "DRAFT" && fiche.status !== "REJECTED") {
      return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });
    }

    // --- Technique COLLECTIVE (type d'action) : vérification des partenaires ---
    if (fiche.actionType === "COLLECTIVE") {
      const author = await prisma.user.findUnique({
        where: { id: me.id },
        select: { username: true, rangClan: true, clan: true },
      });

      const pseudos = Array.from(
        new Set(
          (fiche.collaborators ?? [])
            .map((s) => s.trim())
            .filter(Boolean)
            .filter((p) => p.toLowerCase() !== (author?.username ?? "").toLowerCase())
        )
      );

      // 1 ou 2 partenaires (auteur compris : duo ou trio).
      if (pseudos.length < 1 || pseudos.length > 2) {
        return NextResponse.json({ error: "PARTENAIRES_REQUIS", min: 1, max: 2 }, { status: 400 });
      }

      // Résolution des pseudos exacts (+ clan, pour la règle du duo).
      const found = await prisma.user.findMany({
        where: { username: { in: pseudos } },
        select: { id: true, username: true, clan: true },
      });
      const foundByName = new Map(found.map((u) => [u.username.toLowerCase(), u]));
      const missing = pseudos.filter((p) => !foundByName.has(p.toLowerCase()));

      if (missing.length > 0) {
        // Pseudo erroné → auto-refus.
        await prisma.ficheTechnique.update({
          where: { id },
          data: {
            status: "REJECTED",
            rejectionReason: `Pseudo(s) participant(s) introuvable(s) : ${missing.join(", ")}.`,
            collaboratorIds: [],
          },
        });
        return NextResponse.json(
          { ok: false, error: "PSEUDO_INTROUVABLE", missing, autoRejected: true },
          { status: 422 }
        );
      }

      // Duo (1 partenaire) autorisé seulement si Rang Clan B+ ET même clan.
      if (pseudos.length === 1) {
        const partner = foundByName.get(pseudos[0].toLowerCase())!;
        const rangOk = rankIndex(author?.rangClan ?? null) >= RANKS.indexOf("B");
        const sameClan =
          !!author?.clan &&
          !!partner.clan &&
          author.clan.toLowerCase() === partner.clan.toLowerCase();
        if (!rangOk || !sameClan) {
          return NextResponse.json(
            { error: "DUO_NON_AUTORISE", min: 2, max: 2 },
            { status: 400 }
          );
        }
      }

      const collaboratorIds = pseudos.map((p) => foundByName.get(p.toLowerCase())!.id);
      const updated = await prisma.ficheTechnique.updateMany({
        where: { id, authorId: me.id, status: { in: ["DRAFT", "REJECTED"] }, isActive: true },
        data: { status: "PENDING", rejectionReason: null, collaboratorIds },
      });
      if (updated.count === 0) return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });
      return NextResponse.json({ ok: true });
    }

    // --- Cas normal ---
    const updated = await prisma.ficheTechnique.updateMany({
      where: { id, authorId: me.id, status: { in: ["DRAFT", "REJECTED"] }, isActive: true },
      data: { status: "PENDING", rejectionReason: null },
    });
    if (updated.count === 0) return NextResponse.json({ error: "INVALID_STATE" }, { status: 409 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
