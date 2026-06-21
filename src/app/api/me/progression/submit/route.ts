import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { progressionSubmitSchema } from "@/lib/validators";
import { condMeta, scopeKeyFor, submissionGate, type Rank } from "@/lib/progression";
import { effectiveCommRankForUserTrack } from "@/lib/progression-server";

// POST /api/me/progression/submit
// Soumet UN RP pour une condition (compteur incrémental, validation staff).
// Le client envoie condId + détail du RP (titre/lien/commentaire). Le serveur
// résout track/tier/palier/scope, vérifie le gating (palier ACTIVE), et crée
// une soumission PENDING.
export async function POST(req: Request) {
  try {
    const me = await requireUser();

    const rl = rateLimit(`prog-submit:${me.id}`, 40, 60_000);
    if (!rl.ok) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = progressionSubmitSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });
    const { condId, rpTitle, rpUrl, comment } = parsed.data;

    const meta = condMeta(condId);
    if (!meta) return NextResponse.json({ error: "CONDITION_INCONNUE" }, { status: 400 });

    // Condition gérée par le staff : pas de soumission membre (validée en direct).
    if (meta.adminManaged) {
      return NextResponse.json({ error: "STAFF_ONLY" }, { status: 403 });
    }

    const user = await prisma.user.findUnique({
      where: { id: me.id },
      select: { clan: true, rangVillage: true, rangClan: true, rangHistoire: true },
    });
    if (!user) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });

    // Voie du Clan : nécessite d'appartenir à un clan.
    if (meta.track === "CLAN" && !user.clan?.trim()) {
      return NextResponse.json({ error: "CLAN_REQUIS" }, { status: 400 });
    }

    // Scope : communautaire = "konoha" / nom du clan ; individuel = "self".
    const communityScope =
      meta.tier === "COMMUNITY" ? scopeKeyFor(meta.track, meta.tier, user.clan) : null;
    if (meta.tier === "COMMUNITY" && !communityScope) {
      return NextResponse.json({ error: "SCOPE_INTROUVABLE" }, { status: 400 });
    }
    const scopeKey = communityScope ?? "self";

    // --- Gating : le palier doit être ACTIVE (et la condition non AUTO). ---
    const personalRank = (
      meta.track === "VILLAGE"
        ? user.rangVillage
        : meta.track === "CLAN"
        ? user.rangClan
        : user.rangHistoire
    ) as Rank | null;
    const effectiveCommRank = await effectiveCommRankForUserTrack(meta.track, user.clan);
    const gate = submissionGate(meta, {
      personalRank: personalRank ?? "E",
      effectiveCommRank,
    });
    if (!gate.ok) return NextResponse.json({ error: gate.reason }, { status: 409 });

    // Anti-empilement :
    //  - oneshot : une seule soumission active par SCOPE (communautaire, l'accomplissement
    //    est unique pour tout le village/clan) ou par joueur (individuel).
    //  - count   : refus si la cible est déjà atteinte (compteur plein) — la garde UI
    //    (`!met`) est ainsi aussi appliquée côté serveur.
    if (meta.mode === "oneshot") {
      const active = await prisma.progressionSubmission.findFirst({
        where:
          meta.tier === "COMMUNITY"
            ? { track: meta.track, tier: "COMMUNITY", condId, scopeKey, status: { in: ["PENDING", "VALIDATED"] } }
            : { userId: me.id, tier: "INDIVIDUAL", condId, status: { in: ["PENDING", "VALIDATED"] } },
        select: { status: true },
      });
      if (active) {
        return NextResponse.json(
          { error: active.status === "VALIDATED" ? "DEJA_VALIDEE" : "DEJA_SOUMISE" },
          { status: 409 }
        );
      }
    } else if (meta.mode === "count") {
      const validated = await prisma.progressionSubmission.count({
        where:
          meta.tier === "COMMUNITY"
            ? { track: meta.track, tier: "COMMUNITY", condId, scopeKey, status: "VALIDATED" }
            : { userId: me.id, tier: "INDIVIDUAL", condId, status: "VALIDATED" },
      });
      if (validated >= meta.target) {
        return NextResponse.json({ error: "DEJA_ATTEINT" }, { status: 409 });
      }
    }

    // Lien RP : tolère un lien sans schéma (les membres collent souvent une URL nue).
    const rawUrl = rpUrl?.trim();
    const normalizedUrl = rawUrl
      ? /^https?:\/\//i.test(rawUrl)
        ? rawUrl
        : `https://${rawUrl}`
      : null;

    await prisma.progressionSubmission.create({
      data: {
        userId: me.id,
        track: meta.track,
        tier: meta.tier,
        targetRank: meta.rank,
        condId,
        scopeKey,
        rpTitle: rpTitle?.trim() || null,
        rpUrl: normalizedUrl,
        comment: comment?.trim() || null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    return jsonError(e);
  }
}
