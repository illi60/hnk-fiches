import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireAdmin, jsonError } from "@/lib/permissions";
import { adminClanLibraryPermissionSchema } from "@/lib/validators";
import { clanScopeKey } from "@/lib/kekkei-server";

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await req.json().catch(() => null);
    const parsed = adminClanLibraryPermissionSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ ok: false, error: "INVALID" }, { status: 400 });

    const data = parsed.data;
    const clan = data.clan.trim();
    const value = data.value.trim();
    const clanKey = clanScopeKey(clan);
    if (!clanKey) return NextResponse.json({ ok: false, error: "INVALID_CLAN" }, { status: 400 });

    const permission = await prisma.clanLibraryPermission.upsert({
      where: { clanKey_kind_value: { clanKey, kind: data.kind, value } },
      update: { clan },
      create: { clan, clanKey, kind: data.kind, value },
    });

    return NextResponse.json({ ok: true, permission });
  } catch (e) {
    return jsonError(e);
  }
}
