import { setTimeout as delay } from 'node:timers/promises';
import { loadEnvConfig } from '@next/env';
import { prisma } from '../src/lib/prisma';
import { refreshForumEconomy } from '../src/lib/economy-server';
loadEnvConfig(process.cwd());

// Run only after deploying the new accounting engine. Does not erase history,
// reset techniques, or reactivate any catalogue item. Retry is idempotent.
async function main() {
  if (!process.argv.includes('--apply')) {
    console.log('Après mise en service du nouveau calcul XP : npm run reconcile:xp -- --apply.');
    return;
  }
  const users = await prisma.user.findMany({where:{forumUserId:{not:null}},select:{id:true,username:true},orderBy:{id:'asc'}});
  const outcomes: Array<Record<string, unknown>> = [];
  for (const [index,user] of users.entries()) {
    try {
      const account = await refreshForumEconomy(user.id);
      outcomes.push({username:user.username,ok:true,forumXp:account.forumXp,available:account.available,
        deficit:account.deficit,tradeNet:account.incoming-account.outgoing,needsReview:account.anomalies.length>0});
    } catch (error) {
      const code=error instanceof Error ? error.message : '';
      outcomes.push({username:user.username,ok:false,error:['FORUM_UNAVAILABLE','CONFLICT','FORUM_LINK_REQUIRED','NOT_FOUND'].includes(code)?code:'RECONCILIATION_FAILED'});
      process.exitCode=1;
    }
    console.log(`Rapprochement ${index+1}/${users.length} : ${outcomes.at(-1)?.ok ? 'OK' : 'à reprendre'}`);
    if(index<users.length-1) await delay(1500);
  }
}
main().catch(()=>{console.error('RECONCILIATION_FAILED');process.exitCode=1;}).finally(()=>prisma.$disconnect());
