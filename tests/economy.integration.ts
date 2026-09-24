/** PostgreSQL integration suite: creates a uniquely named private test schema,
 * never uses application records, drops ONLY that generated schema in finally. */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync, rmSync} from 'node:fs';
import {loadEnvConfig} from '@next/env';
import {PrismaClient} from '@prisma/client';
loadEnvConfig(process.cwd());

async function main() {
  const schema = 'audit_economy_' + randomUUID().replaceAll('-', '');
  assert.match(schema, /^audit_economy_[a-f0-9]{32}$/);
  const originalUrl = process.env.DATABASE_URL!;
  const url = new URL(originalUrl); url.searchParams.set('schema', schema); url.searchParams.set('connection_limit', '5');
  const admin = new PrismaClient({datasourceUrl:originalUrl});
  const db = new PrismaClient({datasourceUrl:url.toString()});
  let created = false;
  const originalFetch = globalThis.fetch;
  const forum = new Map<number, number>();
  const outcomes: Array<{name:string;ok:boolean}> = [];
  try {
    await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`); created = true;
    const sql = readFileSync('tests/.economy-test-schema.sql','utf8').replace('CREATE SCHEMA IF NOT EXISTS "public";', '');
    assert.ok(!sql.includes('"public".'));
    await admin.$transaction(async tx => {
      await tx.$executeRawUnsafe(`SET LOCAL search_path TO "${schema}"`);
      for (const statement of sql.split(';').filter(s=>s.trim())) await tx.$executeRawUnsafe(statement);
    }, {timeout:60000});
    const location = await db.$queryRaw<Array<{current_schema:string}>>`SELECT current_schema()`;
    assert.equal(location[0].current_schema, schema);
    (globalThis as unknown as {prisma:PrismaClient}).prisma = db;
    process.env.DATABASE_URL = url.toString();
    globalThis.fetch = async input => {
      const id = Number(String(input).match(/\/u(\d+)/)?.[1]);
      if (!forum.has(id)) return new Response('',{status:503});
      return new Response(`<div id="hnk-profile-data"><span class="hnk-pf"><span class="pk">Expérience</span><span class="pv">${forum.get(id)}</span></span></div>`);
    };
    const {economyTransaction,refreshForumEconomy,loadEconomy,reconcileEconomy,lockEconomyUsers} = await import('../src/lib/economy-server');
    const {getOrSyncUser} = await import('../src/lib/forum-sync');
    const {resetTechniques} = await import('../src/lib/technical-reset-server');
    const {validateFiche} = await import('../src/lib/fiche-validation-server');
    const {adjustAdminXp} = await import('../src/lib/admin-xp-server');
    const {createTrade,acceptTradeStep,submitTradeOffer,cancelTrade} = await import('../src/lib/trades-server');
    const {loadShopItemByKey,loadShopItems,assertShopItemsActive} = await import('../src/lib/shop-server');
    let forumId = 900000;
    async function user(xp=100) {
      const id = ++forumId; forum.set(id,xp);
      const u = await db.user.create({data:{email:`${id}@example.invalid`,username:`Audit ${id}`,passwordHash:'not-a-login',forumUserId:id}});
      await refreshForumEconomy(u.id); return u;
    }
    async function spend(id:string,amount:number) {
      return economyTransaction([id],async tx=>{
        const u=await tx.user.findUniqueOrThrow({where:{id}});
        if(u.xpAvailable<amount) throw Error('INSUFFICIENT_XP');
        await tx.user.update({where:{id},data:{xpAvailable:{decrement:amount},version:{increment:1}}});
        return tx.xPTransaction.create({data:{userId:id,amount:-amount,reason:'ARTS_SPEND'}});
      });
    }
    async function check(name:string,fn:()=>Promise<void>) {await fn();outcomes.push({name,ok:true});console.log('PASS '+name);}

    await check('manual XP adjustments persist, deduplicate and reject overdrafts',async()=>{
      const u=await user();
      const input={userId:u.id,amount:60,note:'Correction staff',operationId:randomUUID()};
      await Promise.all([adjustAdminXp(u.id,input),adjustAdminXp(u.id,input)]);
      assert.equal((await refreshForumEconomy(u.id)).available,160);
      assert.equal(await db.xPTransaction.count({where:{userId:u.id,reason:'ADMIN_GRANT'}}),1);
      await adjustAdminXp(u.id,{...input,amount:-40,operationId:randomUUID()});
      assert.equal((await refreshForumEconomy(u.id)).available,120);
      await assert.rejects(adjustAdminXp(u.id,{...input,amount:-121,operationId:randomUUID()}),/INSUFFICIENT_XP/);
      assert.equal((await loadEconomy(db,u.id)).available,120);
      await db.user.update({where:{id:u.id},data:{characterStatus:'DEAD_MISSING'}});
      await assert.rejects(adjustAdminXp(u.id,{...input,operationId:randomUUID()}),/CHARACTER_FROZEN/);
    });

    await check('two simultaneous purchases cannot spend the same funds',async()=>{
      const u=await user(); const results=await Promise.allSettled([spend(u.id,80),spend(u.id,80)]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      assert.equal((await loadEconomy(db,u.id)).available,20);
    });
    await check('failed transaction rolls back wallet and payment together',async()=>{
      const u=await user();await assert.rejects(economyTransaction([u.id],async tx=>{
        await tx.user.update({where:{id:u.id},data:{xpAvailable:{decrement:30}}});
        await tx.xPTransaction.create({data:{userId:u.id,amount:-30,reason:'ARTS_SPEND'}});throw Error('INJECTED');
      }),/INJECTED/);
      assert.equal((await loadEconomy(db,u.id)).available,100);
    });
    await check('forum decrease records deficit; recovery does not mint XP',async()=>{
      const u=await user();await spend(u.id,100);forum.set(u.forumUserId!,80);
      assert.equal((await refreshForumEconomy(u.id)).deficit,20);
      await assert.rejects(spend(u.id,1),/XP_BUDGET_EXCEEDED/);
      forum.set(u.forumUserId!,110);assert.equal((await refreshForumEconomy(u.id)).available,10);
      assert.equal(await db.adminAlert.count({where:{userId:u.id,kind:'XP_BUDGET'}}),1);
    });
    await check('expired observations cannot authorize a purchase',async()=>{
      const u=await user();await db.user.update({where:{id:u.id},data:{forumLastSyncAt:new Date(0)}});
      await assert.rejects(spend(u.id,1),/FORUM_REFRESH_REQUIRED/);
    });
    await db.shopCatalogItem.create({data:{itemKey:'jeton-reroll-ft',name:'Audit reroll',category:'SERVICES',costXp:50,kanji:'転',description:'test',effect:'test',isActive:false}});
    await check('inactive catalogue is refused by loader and real reset service',async()=>{
      const u=await user();assert.equal(await loadShopItemByKey('jeton-reroll-ft'),undefined);
      assert.equal((await loadShopItems()).length,0);
      await assert.rejects(resetTechniques(u.id,randomUUID()),/NOT_FOUND/);
      assert.equal(await db.xPTransaction.count({where:{userId:u.id,reason:'FICHE_REJECTED_REFUND'}}),0);
    });
    await db.shopCatalogItem.update({where:{itemKey:'jeton-reroll-ft'},data:{isActive:true}});
    await check('catalogue deactivated after quote cannot be purchased',async()=>{
      const u=await user(),item=(await loadShopItemByKey('jeton-reroll-ft'))!;
      await db.shopCatalogItem.update({where:{itemKey:item.key},data:{isActive:false}});
      await assert.rejects(economyTransaction([u.id],tx=>assertShopItemsActive(tx,[item])),/INELIGIBLE/);
      await db.shopCatalogItem.update({where:{itemKey:item.key},data:{isActive:true}});
    });
    await check('simultaneous fiche validations debit once; retry cannot debit again',async()=>{
      const u=await user(200);
      const f=await db.ficheTechnique.create({data:{slug:randomUUID(),nom:'Pending',description:'test',authorId:u.id,status:'PENDING'}});
      const results=await Promise.allSettled([validateFiche(u.id,f.id,40),validateFiche(u.id,f.id,40)]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      await assert.rejects(validateFiche(u.id,f.id,40),/INVALID_STATE/);
      assert.equal(await db.xPTransaction.count({where:{userId:u.id,reason:'FICHE_VALIDATED'}}),1);
      assert.equal((await loadEconomy(db,u.id)).available,160);
    });
    await check('real zero-price validation creates no refundable payment',async()=>{
      const u=await user(200);
      const f=await db.ficheTechnique.create({data:{slug:randomUUID(),nom:'Zero override',description:'test',authorId:u.id,status:'PENDING',coutXp:100}});
      await validateFiche(u.id,f.id,0);
      assert.equal(await db.xPTransaction.count({where:{userId:u.id,reason:'FICHE_VALIDATED'}}),0);
      const reset=await resetTechniques(u.id,randomUUID(),u.id) as {refund:number};
      assert.equal(reset.refund,0);assert.equal((await loadEconomy(db,u.id)).available,200);
    });
    await check('retired shared participant prevents stale pending validation',async()=>{
      const a=await user(),b=await user();
      const f=await db.ficheTechnique.create({data:{slug:randomUUID(),nom:'Retired pending',description:'test',authorId:a.id,collaboratorIds:[b.id],retiredParticipantIds:[a.id],status:'PENDING',actionType:'COLLECTIVE'}});
      await assert.rejects(validateFiche(a.id,f.id,40),/INVALID_STATE/);
      assert.equal(await db.xPTransaction.count({where:{userId:a.id,reason:'FICHE_VALIDATED'}}),0);
    });
    await check('free technique never refunded; reset replay is idempotent',async()=>{
      const u=await user(200);
      await db.ficheTechnique.create({data:{slug:randomUUID(),nom:'Free',description:'test',authorId:u.id,status:'VALIDATED',coutXp:0}});
      const op=randomUUID();const first=await resetTechniques(u.id,op) as {refund:number;xpAvailable:number};
      assert.equal(first.refund,0);assert.equal(first.xpAvailable,150);
      assert.deepEqual(await resetTechniques(u.id,op),first);
      assert.equal(await db.xPTransaction.count({where:{userId:u.id,reason:'SHOP_SPEND'}}),1);
      assert.equal((await loadEconomy(db,u.id)).available,150);
      assert.equal(await db.inventoryItem.count({where:{userId:u.id,itemKey:'jeton-reroll-ft'}}),0);
    });
    await check('reroll refunds paid fiches and current arts, preserves quintessence, and charges each tier',async()=>{
      const u=await user(300);
      const paid=await db.ficheTechnique.create({data:{slug:randomUUID(),nom:'Paid technique',description:'test',authorId:u.id,status:'PENDING'}});
      await validateFiche(u.id,paid.id,40);
      await db.ficheTechnique.create({data:{slug:randomUUID(),nom:'Free technique',description:'test',authorId:u.id,status:'VALIDATED',coutXp:0}});
      const art=await spend(u.id,10);
      await db.xPTransaction.update({where:{id:art.id},data:{metadata:{type:'rankSpec',art:'ninjutsu',spec:1}}});
      const progressionState={quintessences:[{kind:'ART',target:'Ninjutsu'}]};
      await economyTransaction([u.id],async tx=>{
        await tx.user.update({where:{id:u.id},data:{xpAvailable:{decrement:100},artsState:{ninjutsu:{primarySpec:0,specs:[null,'D',null]}},progressionState}});
        await tx.xPTransaction.create({data:{userId:u.id,amount:-100,reason:'QUINTESSENCE_SPEND',metadata:{kind:'ART',target:'Ninjutsu'}}});
      });
      const firstId=randomUUID();
      const first=await resetTechniques(u.id,firstId) as {refund:number;cost:number;xpAvailable:number};
      assert.equal(first.refund,50);assert.equal(first.cost,50);assert.equal(first.xpAvailable,150);
      assert.deepEqual(await resetTechniques(u.id,firstId),first);
      const after=await db.user.findUniqueOrThrow({where:{id:u.id}});
      assert.deepEqual(after.progressionState,progressionState);
      assert.equal(after.artsState,null);
      assert.equal(await db.inventoryItem.count({where:{userId:u.id,itemKey:'jeton-reroll-ft'}}),0);
      const receipt=await db.xPTransaction.findFirstOrThrow({where:{userId:u.id,reason:'FICHE_REJECTED_REFUND',metadata:{path:['operationId'],equals:firstId}}});
      assert.equal((receipt.metadata as {allocations:{amount:number}[]}).allocations.reduce((sum,a)=>sum+a.amount,0),50);
      const second=await resetTechniques(u.id,randomUUID()) as {refund:number;cost:number;xpAvailable:number};
      assert.equal(second.refund,0);assert.equal(second.cost,63);assert.equal(second.xpAvailable,87);
      await assert.rejects(resetTechniques(u.id,randomUUID()),/INSUFFICIENT_XP/);
      assert.equal(await db.xPTransaction.count({where:{userId:u.id,reason:'SHOP_SPEND',metadata:{path:['source'],equals:'SHOP_REROLL_FT'}}}),2);
      assert.equal((await loadEconomy(db,u.id)).available,87);
    });
    await check('shared technique survives owner reset for its paying partner',async()=>{
      const a=await user(200),b=await user(200);
      const f=await db.ficheTechnique.create({data:{slug:randomUUID(),nom:'Shared',description:'test',authorId:a.id,collaboratorIds:[b.id],status:'VALIDATED',coutXp:60}});
      for(const u of [a,b])await economyTransaction([u.id],async tx=>{
        await tx.xPTransaction.create({data:{userId:u.id,amount:-30,reason:'FICHE_VALIDATED',metadata:{ficheId:f.id}}});
      });
      await resetTechniques(a.id,randomUUID(),a.id);
      let shared=await db.ficheTechnique.findUniqueOrThrow({where:{id:f.id}});
      assert.equal(shared.isActive,true);assert.deepEqual(shared.retiredParticipantIds,[a.id]);
      assert.equal((await loadEconomy(db,a.id)).available,200);assert.equal((await loadEconomy(db,b.id)).available,170);
      await resetTechniques(b.id,randomUUID(),b.id);
      shared=await db.ficheTechnique.findUniqueOrThrow({where:{id:f.id}});assert.equal(shared.isActive,false);
      assert.equal((await loadEconomy(db,b.id)).available,200);
    });
    await check('finalized trades conserve funds and recognize the sole exception',async()=>{
      const a=await user(),b=await user();const t=await createTrade({initiatorId:a.id,recipientId:b.id,message:'Test'});
      await acceptTradeStep(b.id,t.id);await submitTradeOffer(a.id,t.id,{items:[],xp:30});await submitTradeOffer(b.id,t.id,{items:[],xp:50});
      assert.equal((await loadEconomy(db,a.id)).available,70);
      await acceptTradeStep(a.id,t.id);await acceptTradeStep(b.id,t.id);
      assert.equal((await loadEconomy(db,a.id)).available,120);assert.equal((await loadEconomy(db,b.id)).available,80);
    });
    await check('current holdings baseline ignores old costs and refunds only active paid techniques',async()=>{
      const u=await user(200);await spend(u.id,120);
      const paid=await db.ficheTechnique.create({data:{slug:randomUUID(),nom:'Current paid',description:'test',authorId:u.id,status:'PENDING'}});
      await validateFiche(u.id,paid.id,40);
      const currentArt=await spend(u.id,10);
      await db.xPTransaction.update({where:{id:currentArt.id},data:{metadata:{type:'rankSpec',art:'ninjutsu',spec:1}}});
      await db.user.update({where:{id:u.id},data:{artsState:{ninjutsu:{primarySpec:0,specs:[null,'D',null]}}}});
      await db.ficheTechnique.create({data:{slug:randomUUID(),nom:'Current free',description:'test',authorId:u.id,status:'VALIDATED',coutXp:0}});
      await db.inventoryItem.create({data:{userId:u.id,itemKey:'current-item',itemName:'Current item',costXp:30,quantity:1}});
      const payment=await db.xPTransaction.findFirstOrThrow({where:{userId:u.id,reason:'FICHE_VALIDATED',metadata:{path:['ficheId'],equals:paid.id}}});
      await db.$transaction(async tx=>{
        await lockEconomyUsers(tx,[u.id]);
        await tx.xPTransaction.create({data:{userId:u.id,reason:'FORUM_SYNC',amount:0,
          metadata:{source:'XP_BUDGET_BASELINE',allocations:[{debitId:payment.id,amount:40},{debitId:currentArt.id,amount:10}],nonRefundable:30}}});
        await reconcileEconomy(tx,u.id);
      });
      assert.equal((await loadEconomy(db,u.id)).available,120);
      const reset=await resetTechniques(u.id,randomUUID(),u.id) as {refund:number};
      assert.equal(reset.refund,50);assert.equal((await loadEconomy(db,u.id)).available,170);
      await assert.rejects(spend(u.id,171),/INSUFFICIENT_XP/);
      assert.equal((await db.inventoryItem.findUniqueOrThrow({where:{userId_itemKey:{userId:u.id,itemKey:'current-item'}}})).quantity,1);
    });
    await check('unfunded reservations cannot be sent; cancellation remains possible',async()=>{
      const a=await user(),b=await user();const t=await createTrade({initiatorId:a.id,recipientId:b.id,message:'Test'});
      await acceptTradeStep(b.id,t.id);await submitTradeOffer(a.id,t.id,{items:[],xp:30});await submitTradeOffer(b.id,t.id,{items:[],xp:0});
      forum.set(a.forumUserId!,10);await assert.rejects(acceptTradeStep(a.id,t.id),/XP_BUDGET_EXCEEDED/);
      await cancelTrade(a.id,t.id);assert.equal((await loadEconomy(db,a.id)).available,10);
      assert.equal((await loadEconomy(db,b.id)).available,100);
    });
    await check('forum outage refuses refresh without modifying the account',async()=>{
      const u=await user();forum.delete(u.forumUserId!);await assert.rejects(refreshForumEconomy(u.id),/FORUM_UNAVAILABLE/);
      assert.equal((await loadEconomy(db,u.id)).available,100);
    });
    await check('dead or missing character keeps XP frozen and clears budget alerts',async()=>{
      const u=await user(120);await spend(u.id,20);
      const frozenBefore=await db.user.update({where:{id:u.id},data:{characterStatus:'DEAD_MISSING'}});
      await db.adminAlert.create({data:{userId:u.id,kind:'XP_BUDGET',title:'test',body:'test'}});
      forum.set(u.forumUserId!,500);
      const skipped=await getOrSyncUser(u.id,{force:true});assert.equal(skipped.skipped,true);
      await assert.rejects(refreshForumEconomy(u.id),/CHARACTER_FROZEN/);
      await db.$transaction(async tx=>{await lockEconomyUsers(tx,[u.id]);await reconcileEconomy(tx,u.id)});
      const frozenAfter=await db.user.findUniqueOrThrow({where:{id:u.id}});
      assert.equal(frozenAfter.xpAvailable,frozenBefore.xpAvailable);
      assert.equal(frozenAfter.xpTotalEarned,frozenBefore.xpTotalEarned);
      assert.equal(frozenAfter.forumLastXp,frozenBefore.forumLastXp);
      assert.equal(await db.adminAlert.count({where:{userId:u.id,kind:'XP_BUDGET',isRead:false}}),0);
    });
    await check('staff and test roles are exempt from forum budget blocking',async()=>{
      for(const role of ['ADMIN','TECH_MOD','FORUM_MOD'] as const){
        const id=++forumId;
        const u=await db.user.create({data:{email:`${id}@example.invalid`,username:`Staff ${id}`,passwordHash:'not-a-login',role,xpAvailable:500}});
        const result=await economyTransaction([u.id],async tx=>{
          await tx.user.update({where:{id:u.id},data:{xpAvailable:{decrement:50}}});
          await tx.xPTransaction.create({data:{userId:u.id,amount:-50,reason:'SHOP_SPEND'}});
          return true;
        });
        assert.equal(result,true);assert.equal((await loadEconomy(db,u.id)).available,450);
        assert.equal(await db.adminAlert.count({where:{userId:u.id,kind:'XP_BUDGET',isRead:false}}),0);
      }
      const id=++forumId;
      const testUser=await db.user.create({data:{email:`${id}@example.invalid`,username:`Test ${id}`,passwordHash:'not-a-login',xpBudgetExempt:true,xpAvailable:500}});
      assert.equal((await refreshForumEconomy(testUser.id)).available,500);
      await spend(testUser.id,50);
      assert.equal((await loadEconomy(db,testUser.id)).available,450);
    });
    await check('database uniqueness prevents sharing one forum funding source',async()=>{
      const u=await user();await assert.rejects(db.user.create({data:{username:randomUUID(),email:randomUUID()+'@example.invalid',passwordHash:'test',forumUserId:u.forumUserId}}));
    });
    await check('a stale technical write cannot overwrite the committed reset',async()=>{
      const u=await user();const old=await db.user.findUniqueOrThrow({where:{id:u.id}});
      await resetTechniques(u.id,randomUUID(),u.id);
      const changed=await db.user.updateMany({where:{id:u.id,version:old.version},data:{artsState:{ninjutsu:{expertised:true}},version:{increment:1}}});
      assert.equal(changed.count,0);
    });
  } finally {
    globalThis.fetch=originalFetch;
    await db.$disconnect();
    if(created) {
      assert.match(schema,/^audit_economy_[a-f0-9]{32}$/);
      await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
      console.log('Isolated test schema removed.');
    }
    await admin.$disconnect();
    process.env.DATABASE_URL=originalUrl;
    rmSync('tests/.economy-test-schema.sql',{force:true});
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
