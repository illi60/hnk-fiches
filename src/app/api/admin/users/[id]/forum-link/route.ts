import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, jsonError } from '@/lib/permissions';
import { adminForumLinkSchema } from '@/lib/validators';
import { lockEconomyUsers, reconcileEconomy } from '@/lib/economy-server';
async function updateLink(id: string, forumUserId: number | null) {
  return prisma.$transaction(async tx => {
    await lockEconomyUsers(tx, [id]);
    const current = await tx.user.findUniqueOrThrow({where:{id}});
    if (current.forumUserId !== forumUserId && await tx.xPTransaction.count({where:{userId:id}})) throw new Error('XP_ACCOUNT_HAS_HISTORY');
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
    return NextResponse.json({user:await updateLink(id,Number(match[1]))});
  } catch(error){return jsonError(error);}
}
export async function DELETE(_req:Request,{params}:{params:Promise<{id:string}>}) {
  try {await requireAdmin();const {id}=await params;await updateLink(id,null);return NextResponse.json({ok:true});}
  catch(error){return jsonError(error);}
}
