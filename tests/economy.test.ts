import test from 'node:test';
import assert from 'node:assert/strict';
import {projectEconomy, type EconomyEntry, type EconomyTrade} from '../src/lib/economy';
import {eligibleArtAllocations} from '../src/lib/technical-refund';
import {rerollFtBaseCostForPurchase,shopItemCost,SHOP_REROLL_FT_ITEM_KEY} from '../src/lib/shop';
const at = (day: number) => new Date(Date.UTC(2026, 0, day));
const e = (id: string, amount: number, reason: string, day = 1, metadata: unknown = {}): EconomyEntry => ({id, amount, reason, createdAt: at(day), metadata});
const trade = (status: string, sent = 0, received = 0): EconomyTrade => ({status, initiatorId: 'u', recipientId: 'v', initiatorXpOffered: sent, recipientXpOffered: received});

test('free validation creates no refund rights; only actual negative payments count', () => {
  const account = projectEconomy('u', 100, [e('free', 0, 'FICHE_VALIDATED'), e('paid', -20, 'FICHE_VALIDATED')], []);
  assert.equal(account.available, 80); assert.deepEqual(account.outstanding.map(d => d.entry.id), ['paid']);
});
test('reroll cost rises from actual purchases and charges its own discounted price', () => {
  const item={key:SHOP_REROLL_FT_ITEM_KEY,costXp:50};
  assert.deepEqual(Array.from({length:6},(_,previous)=>rerollFtBaseCostForPurchase(item,previous)),[50,63,94,141,211,317]);
  assert.equal(shopItemCost(item,true,1),48);
});
test('only current paid arts are eligible, with old cycles and quintessences excluded', () => {
  const state={ninjutsu:{primarySpec:0,specs:[null,'D',null] as ('D'|null)[]},kuchiyose:{unlocked:true}};
  const outstanding=[
    {entry:e('old',-10,'ARTS_SPEND',1,{type:'rankSpec',art:'ninjutsu',spec:1}),amount:10},
    {entry:e('current',-10,'ARTS_SPEND',2,{type:'rankSpec',art:'ninjutsu',spec:1}),amount:10},
    {entry:e('kuchi',-20,'ARTS_SPEND',2,{type:'unlockKuchiyose'}),amount:20},
    {entry:e('quint',-100,'QUINTESSENCE_SPEND',2,{kind:'ART',target:'ninjutsu'}),amount:100},
  ];
  assert.deepEqual(eligibleArtAllocations(outstanding,state),[{debitId:'kuchi',amount:20},{debitId:'current',amount:10}]);
  const account=projectEconomy('u',200,[e('quint',-100,'QUINTESSENCE_SPEND')],[]);
  assert.equal(account.spent,100);
  assert.equal(account.available,100);
});
test('administrative grants, registration bonuses and old forum credits cannot fund an account', () => {
  const account = projectEconomy('u', 100, [e('gift', 1000, 'ADMIN_GRANT'), e('bonus', 500, 'REGISTRATION_BONUS'), e('sync', 2000, 'FORUM_SYNC')], []);
  assert.equal(account.available, 100); assert.equal(account.budget, 100);
});
test('audited staff adjustments survive forum sync and cannot refund removals', () => {
  const metadata = { source: 'XP_ADMIN_ADJUSTMENT' };
  const entries = [e('credit', 60, 'ADMIN_GRANT', 1, metadata), e('remove', -20, 'ADMIN_REMOVE', 2, metadata)];
  assert.equal(projectEconomy('u', 100, entries, []).available, 140);
  assert.equal(projectEconomy('u', 110, entries, []).available, 150);
  assert.equal(projectEconomy('u', 100, entries, [trade('REQUESTED', 30)]).available, 110);
  const refund = e('refund', 20, 'FICHE_REJECTED_REFUND', 3, { allocations: [{ debitId: 'remove', amount: 20 }] });
  assert.equal(projectEconomy('u', 100, [...entries, refund], []).available, 140);
});

test('a forum decrease and subsequent recovery do not mint XP', () => {
  const entries = [e('paid', -30, 'ARTS_SPEND'), e('oldsync', 100, 'FORUM_SYNC')];
  assert.equal(projectEconomy('u', 100, entries, []).available, 70);
  assert.equal(projectEconomy('u', 80, entries, []).available, 50);
  assert.equal(projectEconomy('u', 100, entries, []).available, 70);
});
test('reserved XP is not spendable and is not transferred before acceptance', () => {
  const t = trade('FINAL_PENDING', 30, 50);
  const account = projectEconomy('u', 100, [], [t]);
  assert.equal(account.budget, 100); assert.equal(account.available, 70); assert.equal(account.reserved, 30);
});
test('accepted trades are the only budget exception; outgoing funds are subtracted', () => {
  const t = trade('ACCEPTED', 30, 50);
  assert.equal(projectEconomy('u', 100, [], [t]).available, 120);
  assert.equal(projectEconomy('v', 100, [], [t]).available, 80);
});
test('trade cancellation releases a reservation once without creating source XP', () => {
  const entries = [e('reserve', -30, 'SHOP_SPEND', 1, {tradeId: 't', tradeReason: 'TRADE_RESERVE'}), e('release', 30, 'SHOP_SPEND', 2, {tradeId: 't', tradeReason: 'TRADE_RELEASE'})];
  assert.equal(projectEconomy('u', 100, entries, [trade('CANCELLED', 30)]).available, 100);
});
test('legacy transfer ledger rows do not double-count a finalized trade', () => {
  const entries = [e('incoming', 50, 'SHOP_SPEND', 1, {tradeId: 't', fromUserId: 'v'}), e('outgoing', -30, 'SHOP_SPEND', 1, {tradeId: 't'})];
  assert.equal(projectEconomy('u', 100, entries, [trade('ACCEPTED', 30, 50)]).available, 120);
});
test('linked refunds reduce expenditure exactly, with equal timestamps supported', () => {
  const entries = [e('z-paid', -30, 'FICHE_VALIDATED'), e('a-refund', 30, 'FICHE_REJECTED_REFUND', 1, {allocations: [{debitId: 'z-paid', amount: 30}]})];
  const account = projectEconomy('u', 100, entries, []);
  assert.equal(account.available, 100); assert.equal(account.spent, 0); assert.deepEqual(account.anomalies, []);
});
test('partial refunds cannot exceed the remaining paid amount', () => {
  const entries = [e('p', -30, 'FICHE_VALIDATED'), e('r1', 20, 'FICHE_REJECTED_REFUND', 2, {allocations: [{debitId: 'p', amount: 20}]}), e('r2', 20, 'FICHE_REJECTED_REFUND', 3, {allocations: [{debitId: 'p', amount: 20}]})];
  const account = projectEconomy('u', 100, entries, []);
  assert.equal(account.available, 90); assert.ok(account.anomalies.length);
});
test('unlinked refunds do not increase the budget', () => {
  const account = projectEconomy('u', 100, [e('r', 500, 'FICHE_REJECTED_REFUND')], []);
  assert.equal(account.available, 100); assert.ok(account.anomalies.length);
});
test('historical automatic refunds are bounded by outstanding technical payments', () => {
  const entries = [e('p', -30, 'ARTS_SPEND'), e('r', 30, 'FICHE_REJECTED_REFUND', 2, {source: 'SHOP_REROLL_FT'}), e('r2', 30, 'FICHE_REJECTED_REFUND', 3, {source: 'SHOP_REROLL_FT'})];
  const account = projectEconomy('u', 100, entries, []);
  assert.equal(account.available, 100); assert.equal(account.refunds, 30); assert.ok(account.anomalies.length);
});
test('manual reset notes are not interpreted as funding or automatic refund rights', () => {
  const entries = [e('old', -385, 'ARTS_SPEND'), e('manual', 331, 'ADMIN_GRANT', 2, {note: 'reset ft'}), e('new', -660, 'FICHE_VALIDATED', 3)];
  const account = projectEconomy('u', 759, entries, []);
  assert.equal(account.spent, 1045); assert.equal(account.available, 0); assert.equal(account.deficit, 286);
});
test('a holdings baseline replaces legacy history without making free techniques refundable', () => {
  const entries = [e('tech', -910, 'FICHE_VALIDATED'), e('arts', -665, 'ARTS_SPEND'), e('rank', -1000, 'PROGRESSION_SPEND'), e('shop', -302, 'SHOP_SPEND'), e('remove', -90, 'ADMIN_REMOVE'), e('grant', 1098, 'ADMIN_GRANT'), e('sync', 826, 'FORUM_SYNC'), e('reroll', 1045, 'FICHE_REJECTED_REFUND', 2, {source: 'SHOP_REROLL_FT'})];
  entries.push(e('baseline', 0, 'FORUM_SYNC', 3, {source: 'XP_BUDGET_BASELINE', allocations: [{debitId: 'tech', amount: 340}, {debitId: 'arts', amount: 140}], nonRefundable: 300}));
  const account = projectEconomy('u', 782, entries, [trade('ACCEPTED', 52, 90)]);
  assert.equal(account.available, 40); assert.equal(account.deficit, 0); assert.equal(account.spent, 780);
  assert.equal(account.outstanding.filter(d => d.entry.reason === 'FICHE_VALIDATED').length, 1);
  assert.equal(account.outstanding.filter(d => d.entry.reason === 'ARTS_SPEND').length, 1);
  assert.equal(account.baselineApplied, true);
});
test('future forum income first pays down a deficit', () => {
  const entries = [e('rank', -100, 'PROGRESSION_SPEND')];
  assert.equal(projectEconomy('u', 80, entries, []).deficit, 20);
  assert.equal(projectEconomy('u', 100, entries, []).available, 0);
  assert.equal(projectEconomy('u', 110, entries, []).available, 10);
});
test('reconciliation records never feed back into expenditure or source', () => {
  const entries = [e('p', -20, 'ARTS_SPEND'), e('fix', -500, 'FORUM_SYNC', 2, {source: 'FORUM_BUDGET_RECONCILIATION'})];
  assert.equal(projectEconomy('u', 100, entries, []).available, 80);
});
test('pre-push restoration preserves a legacy balance while forum XP remains authoritative', () => {
  const entries = [e('spent', -80, 'SHOP_SPEND'), e('restore', 0, 'FORUM_SYNC', 2, {source: 'XP_PRE_PUSH_BALANCE_RESTORE', adjustment: 30})];
  const account = projectEconomy('u', 100, entries, []);
  assert.equal(account.available, 50);
  assert.equal(account.legacyAdjustment, 30);
  assert.equal(projectEconomy('u', 110, entries, []).available, 60);
});
test('conservation holds across all combinations of forum, payments and trades', () => {
  for (let forum = 0; forum <= 100; forum += 10) for (let paid = 0; paid <= 150; paid += 10) for (let incoming = 0; incoming <= 50; incoming += 10) {
    const account = projectEconomy('u', forum, [e('p', -paid, 'FICHE_VALIDATED')], [trade('ACCEPTED', 20, incoming)]);
    assert.equal(account.available - account.deficit + account.spent + account.reserved, account.budget);
    assert.ok(account.available >= 0 && account.deficit >= 0);
  }
});
