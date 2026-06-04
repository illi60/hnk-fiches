import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireFicheModerator, jsonError } from "@/lib/permissions";

// GET /api/admin/fiches?status=PENDING|VALIDATED|REJECTED|DRAFT
//   Par défaut : PENDING (file de modération).
export async function GET(req: Request) {
  try {
    await requireFicheModerator();
    const url = new URL(req.url);
    const statusParam = url.searchParams.get("status") ?? "PENDING";
    const allowed = ["DRAFT", "PENDING", "VALIDATED", "REJECTED"] as const;
    const status = (allowed as readonly string[]).includes(statusParam)
      ? (statusParam as (typeof allowed)[number])
      : "PENDING";

    const fiches = await prisma.ficheTechnique.findMany({
      where: { status, isActive: true },
      orderBy: { createdAt: "asc" },
      take: 100,
      select: {
        id: true,
        slug: true,
        nom: true,
        description: true,
        type: true,
        element: true,
        rangMin: true,
        coutXp: true,
        status: true,
        rejectionReason: true,
        createdAt: true,
        validatedAt: true,
        author: {
          select: { id: true, username: true, xpAvailable: true, clan: true, rang: true },
        },
      },
    });

    return NextResponse.json({ fiches });
  } catch (e) {
    return jsonError(e);
  }
}
