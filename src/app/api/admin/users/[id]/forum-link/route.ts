import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, jsonError } from '@/lib/permissions';
import { adminForumLinkSchema } from '@/lib/validators';
import { lockEconomyUsers, reconcileEconomy } from '@/lib/economy-server';

async function linkNewForumProfile(id: string, forumUserId: number) {
  const current = await prisma.user.findUnique({
    where: { id },
    select: { forumUserId: true },
  });
  if (!current) throw new Error('NOT_FOUND');

  // La première liaison d'un nouveau compte ne touche pas encore à son
  // économie : la première synchronisation forum initialisera le budget XP.
  // Elle ne doit donc dépendre d'aucun verrou ni d'aucune réconciliation.
  if (current.forumUserId === null) {
    const other = await prisma.user.findFirst({
      where: { forumUserId, NOT: { id } },
      select: { id: true },
    });
    if (other) throw new Error('DUPLICATE');

    return prisma.user.update({
      where: { id },
      data: {
        forumUserId,
        forumProfileUrl: `https://hinokuni.forumactif.com/u${forumUserId}`,
        forumLastXp: null,
        forumLastSyncAt: null,
        forumLastSyncError: null,
      },
      select: { id: true, forumUserId: true, forumProfileUrl: true },
    });
  }

  return updateLink(id, forumUserId);
}

async function updateLink(id: string, forumUserId: number | null) {
  return prisma.$transaction(async tx => {
    await lockEconomyUsers(tx, [id]);
    const current = await tx.user.findUniqueOrThrow({where:{id}});
    // Une première liaison reste autorisée même si l'audit a déjà créé une
    // écriture technique pour ce compte. La protection ne doit bloquer que le
    // remplacement (ou le retrait) d'une identité forum ayant déjà financé de
    // l'XP : changer cette source rendrait alors l'historique ambigu.
    const changesExistingForumIdentity =
      current.forumUserId !== null && current.forumUserId !== forumUserId;
    if (
      changesExistingForumIdentity &&
      await tx.xPTransaction.count({where:{userId:id}})
    ) {
      throw new Error('XP_ACCOUNT_HAS_HISTORY');
    }
    if (forumUserId !== null) {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${forumUserId}::bigint)`;
      const other = await tx.user.findFirst({where:{forumUserId, NOT:{id}}});
      if (other) throw new Error('DUPLICATE');
    }
    const user = await tx.user.update({where:{id}, data:{forumUserId,
      forumProfileUrl: forumUserId === null ? null : 'https://hinokuni.forumactif.com/u' + forumUserId,
      forumLastXp: current.forumUserId === forumUserId ? current.forumLastXp : null,
      forumLastSyncAt:null, forumLastSyncError:null, version:{increment:1}},
      select:{id:true,forumUserId:true,forumProfileUrl:true}});
    await reconcileEconomy(tx,id);
    return user;
  });
}
export async function PATCH(req:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    await requireAdmin(); const {id}=await params;
    const parsed=adminForumLinkSchema.safeParse(await req.json().catch(()=>null));
    if(!parsed.success) return NextResponse.json({error:'INVALID'},{status:400});
    const match=parsed.data.forumProfileUrl.match(/\/u(\d+)/);
    if(!match) return NextResponse.json({error:'INVALID'},{status:400});
    return NextResponse.json({user:await linkNewForumProfile(id,Number(match[1]))});
  } catch(error){return jsonError(error);}
}
export async function DELETE(_req:Request,{params}:{params:Promise<{id:string}>}) {
  try {await requireAdmin();const {id}=await params;await updateLink(id,null);return NextResponse.json({ok:true});}
  catch(error){return jsonError(error);}
}
