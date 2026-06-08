import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireUser, jsonError } from "@/lib/permissions";
import { rateLimit } from "@/lib/rate-limit";
import { ficheCreateSchema } from "@/lib/validators";
import { ficheTotalCost } from "@/lib/techniques";
import { clanKg } from "@/lib/kekkei";
import { ownedKgsFull, type ProgressionState } from "@/lib/quintessence";

/**
 * GET /api/fiches?scope=mine|public
 *   - mine   : toutes mes fiches (tous statuts)
 *   - public : catalogue VALIDATED actif (par défaut)
 */
export async function GET(req: Request) {
  try {
    const me = await requireUser();
    const url = new URL(req.url);
    const scope = url.searchParams.get("scope") === "mine" ? "mine" : "public";

    const where =
      scope === "mine"
        ? {
            isActive: true,
            // Mes fiches + celles où je suis participant (type d'action COLLECTIVE).
            OR: [{ authorId: me.id }, { collaboratorIds: { has: me.id } }],
          }
        : { status: "VALIDATED" as const, isActive: true };

    const fiches = await prisma.ficheTechnique.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        slug: true,
        nom: true,
        description: scope === "mine",
        type: true,
        element: true,
        rangMin: true,
        coutXp: true,
        status: true,
        rejectionReason: scope === "mine",
        validatedAt: true,
        createdAt: true,
        author: { select: { id: true, username: true } },
      },
      take: 200,
    });

    return NextResponse.json({ fiches });
  } catch (e) {
    return jsonError(e);
  }
}

/**
 * POST /api/fiches — crée un DRAFT pour l'utilisateur courant.
 * Le coût est recalculé serveur (rangMin → defaultFicheCost), pas
 * transmis par le client.
 */
export async function POST(req: Request) {
  try {
    const me = await requireUser();

    const rl = rateLimit(`fiches-create:${me.id}`, 20, 60 * 60_000);
    if (!rl.ok) return NextResponse.json({ error: "RATE_LIMITED" }, { status: 429 });

    const body = await req.json().catch(() => null);
    const parsed = ficheCreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "INVALID" }, { status: 400 });

    // Slug auto-généré depuis le nom (champ caché côté UI), garanti unique.
    const base =
      (parsed.data.slug && parsed.data.slug.trim()) ||
      parsed.data.nom
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 70) ||
      "technique";
    let slugVal = base;
    for (let i = 2; ; i++) {
      const clash = await prisma.ficheTechnique.findUnique({
        where: { slug: slugVal },
        select: { id: true },
      });
      if (!clash) break;
      slugVal = `${base}-${i}`;
    }

    // Technique de Kuchiyose : l'invocation doit appartenir au joueur.
    let invocationId: string | null = null;
    if (parsed.data.invocationId) {
      const inv = await prisma.invocation.findFirst({
        where: { id: parsed.data.invocationId, ownerId: me.id },
        select: { id: true },
      });
      if (!inv) return NextResponse.json({ error: "INVOCATION_INVALIDE" }, { status: 400 });
      invocationId = inv.id;
    }

    // Kuchy : ni nature ni KG (donc pas de surcharge +10 XP).
    const isKuchy = !!invocationId;
    const natureEff = isKuchy ? null : parsed.data.nature ?? null;
    let kekkeiGenkaiEff = isKuchy ? null : parsed.data.kekkeiGenkai ?? null;

    // Charge le clan du joueur pour les règles COLLECTIVE et surcharge Konoha.
    // COLLECTIVE : requête complète (KG + progressionState). PERSONNELLE : clan seul.
    let meUserClan: string | null = null;
    let isKonoha = false;
    let clan: string | null = null;

    if (natureEff === "COLLECTIVE") {
      const u = await prisma.user.findUnique({
        where: { id: me.id },
        select: { clan: true, primaryKg: true, kekkeiGenkai: true, progressionState: true },
      });
      meUserClan = u?.clan ?? null;
      isKonoha = meUserClan?.toLowerCase().trim() === "konoha";

      if (!meUserClan) return NextResponse.json({ error: "CLAN_REQUIS" }, { status: 400 });
      // Konoha : pas de technique collective.
      if (isKonoha) return NextResponse.json({ error: "CLAN_SANS_KG" }, { status: 400 });
      const ck = clanKg(meUserClan);
      if (!ck) return NextResponse.json({ error: "CLAN_SANS_KG" }, { status: 400 });
      const owned = ownedKgsFull(
        u?.primaryKg ?? null,
        (u?.progressionState ?? {}) as unknown as ProgressionState,
        u?.kekkeiGenkai ?? null
      ).map((k) => k.toLowerCase());
      if (!owned.includes(ck.toLowerCase()))
        return NextResponse.json({ error: "KG_CLAN_REQUIS" }, { status: 403 });
      clan = meUserClan;
      kekkeiGenkaiEff = ck; // KG imposé du clan
    } else if (natureEff === "PERSONNELLE") {
      const u = await prisma.user.findUnique({ where: { id: me.id }, select: { clan: true } });
      meUserClan = u?.clan ?? null;
      isKonoha = meUserClan?.toLowerCase().trim() === "konoha";
    }

    // Konoha : pas de surcharge +10 XP sur les techniques personnelles.
    const coutXp = ficheTotalCost(parsed.data.actionType ?? null, isKonoha ? null : natureEff);

    // Type d'action COLLECTIVE : pseudos des partenaires (résolus à la soumission).
    const collaborators =
      parsed.data.actionType === "COLLECTIVE"
        ? (parsed.data.collaborators ?? []).map((s) => s.trim()).filter(Boolean)
        : [];

    const fiche = await prisma.ficheTechnique.create({
      data: {
        slug: slugVal,
        nom: parsed.data.nom,
        description: parsed.data.description,
        art: parsed.data.art ?? null,
        spec: parsed.data.spec ?? null,
        secondaryArt:
          parsed.data.actionType === "COMBINEE" ? parsed.data.secondaryArt ?? null : null,
        actionType: parsed.data.actionType ?? null,
        element: parsed.data.element ?? null,
        kekkeiGenkai: kekkeiGenkaiEff,
        secondaryElement:
          parsed.data.actionType === "COMBINEE" ? parsed.data.secondaryElement ?? null : null,
        secondaryKekkeiGenkai:
          !isKuchy && parsed.data.actionType === "COMBINEE"
            ? parsed.data.secondaryKekkeiGenkai ?? null
            : null,
        nature: natureEff,
        kinjutsuScope: parsed.data.kinjutsuScope ?? null,
        clan,
        invocationId,
        collaborators,
        comment: parsed.data.comment ?? null,
        type: parsed.data.type ?? null,
        rangMin: parsed.data.rangMin ?? null,
        coutXp,
        status: "DRAFT",
        authorId: me.id,
      },
      select: {
        id: true,
        slug: true,
        nom: true,
        coutXp: true,
        status: true,
      },
    });

    return NextResponse.json({ fiche });
  } catch (e) {
    return jsonError(e);
  }
}
