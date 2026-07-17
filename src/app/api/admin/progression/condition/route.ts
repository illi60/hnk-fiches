import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { progressionConditionSchema } from "@/lib/validators";
import { clanScopeKey, condMeta, condTarget, VILLAGE_SCOPE_KEY } from "@/lib/progression";
import { clanMemberIds, recomputeRanks } from "@/lib/progression-server";

type Target =
  | { kind: "USER"; userId: string; scopeKey: "self" }
  | { kind: "COMMUNITY"; scopeType: "VILLAGE" | "CLAN"; scopeKey: string };

function whereFor(meta: NonNullable<ReturnType<typeof condMeta>>, target: Target) {
  if (target.kind === "USER") {
    return { userId: target.userId, tier: "INDIVIDUAL" as const, condId: meta.id };
  }
  return {
    track: meta.track,
    tier: "COMMUNITY" as const,
    condId: meta.id,
    scopeKey: target.scopeKey,
  };
}

async function recomputeTarget(target: Target) {
  try {
    if (target.kind === "USER") await recomputeRanks([target.userId]);
    else if (target.scopeType === "VILLAGE") await recomputeRanks("all");
    else await recomputeRanks(await clanMemberIds(target.scopeKey));
  } catch (err) {
    console.error("[progression condition] recompute failed", err);
  }
}

// POST /api/admin/progression/condition
// ADMIN : ajoute/retire directement une validation de condition, qu'elle soit
// individuelle ou communautaire. Les validations sont matérialisées comme des
// ProgressionSubmission déjà VALIDATED afin de réutiliser les compteurs existants.
export async function POST(req: Request) {
  try {
    const me = await requireAdmin();

    const body = await req.json().catch(() => null);
    const parsed = progressionConditionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });

    const meta = condMeta(parsed.data.condId);
    if (!meta) return NextResponse.json({ error: "CONDITION_INVALIDE" }, { status: 400 });

    let target: Target;
    if (parsed.data.kind === "USER") {
      if (meta.tier !== "INDIVIDUAL") {
        return NextResponse.json({ error: "TIER_INCOHERENT" }, { status: 400 });
      }
      const user = await prisma.user.findUnique({
        where: { id: parsed.data.userId },
        select: { id: true },
      });
      if (!user) return NextResponse.json({ error: "USER_INVALIDE" }, { status: 404 });
      target = { kind: "USER", userId: user.id, scopeKey: "self" };
    } else {
      if (meta.tier !== "COMMUNITY" || meta.track !== parsed.data.scopeType) {
        return NextResponse.json({ error: "SCOPE_INCOHERENT" }, { status: 400 });
      }
      const scopeKey =
        parsed.data.scopeType === "VILLAGE" ? VILLAGE_SCOPE_KEY : clanScopeKey(parsed.data.scopeKey);
      if (!scopeKey) return NextResponse.json({ error: "SCOPE_INVALIDE" }, { status: 400 });
      target = { kind: "COMMUNITY", scopeType: parsed.data.scopeType, scopeKey };
    }

    const operation = parsed.data.operation;
    const where = whereFor(meta, target);
    const validatedWhere = { ...where, status: "VALIDATED" as const };
    let changed = false;

    if (operation === "SET_UNVALIDATED") {
      const res = await prisma.progressionSubmission.deleteMany({ where: validatedWhere });
      changed = res.count > 0;
    } else if (operation === "REMOVE") {
      const row = await prisma.progressionSubmission.findFirst({
        where: validatedWhere,
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      if (row) {
        await prisma.progressionSubmission.delete({ where: { id: row.id } });
        changed = true;
      }
    } else {
      const current = await prisma.progressionSubmission.count({ where: validatedWhere });
      const targetCount = condTarget(meta.id, meta.count);
      const shouldCreate =
        operation === "ADD"
          ? current < Math.max(1, targetCount)
          : current === 0;

      if (shouldCreate) {
        await prisma.progressionSubmission.create({
          data: {
            userId: target.kind === "USER" ? target.userId : me.id,
            track: meta.track,
            tier: meta.tier,
            targetRank: meta.rank,
            condId: meta.id,
            scopeKey: target.scopeKey,
            status: "VALIDATED",
            reviewedById: me.id,
            reviewedAt: new Date(),
            comment: "Validée directement par le staff.",
          },
        });
        changed = true;
      }
    }

    if (changed) await recomputeTarget(target);

    const count = await prisma.progressionSubmission.count({ where: validatedWhere });
    return NextResponse.json({ ok: true, count, changed });
  } catch (e) {
    return jsonError(e);
  }
}
