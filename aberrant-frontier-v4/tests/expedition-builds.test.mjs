import assert from 'node:assert/strict';
import test from 'node:test';
import {gameHarness} from './harness.mjs';

test('first pick establishes a school, manual preference persists, HUD counts ranks',()=>{
 const {run}=gameHarness(true);
 run("openDraft();const first=run.offers[0];chooseExpedition(first.id);expeditionHUD()");
 assert.ok(run("run.focus===first.school && $('rg-schools').textContent.includes(schools[first.school].name+' 1')"));
 run("showTree();chooseExpedition('focus-frost');chooseExpedition('back')");
 assert.ok(run("Array.from({length:100},(_,i)=>{run.drawNumber=i;return choosePatron()==='frost';}).filter(Boolean).length>=75"));
});

test('station protects dependencies on stowed weapons and resets gear on retry',()=>{
 const {run}=gameHarness(true);
 run("const initial=[...loadout];run.coins=160;acquireGift('edge');acquireGift(loadout[0]+'-1');acquireGift(loadout[0]+'-2');openStation();chooseExpedition('swap');const spare=Object.keys(WEAPONS).find(id=>!loadout.includes(id));chooseExpedition('equip-'+spare)");
 assert.ok(run("loadout[0]===spare && !buildBook().some(t=>t.weapon===initial[0]) && run.coins===138"));
 run("chooseExpedition('mod');chooseExpedition('install-chip');chooseExpedition('install-chip');chooseExpedition('remove');chooseExpedition('remove-edge')");
 assert.ok(run("run.mods[spare] && run.coins===110 && rank('edge')===1 && run.panel==='remove'"));
 run("chooseExpedition('remove-'+initial[0]+'-2')");
 assert.ok(run("run.panel==='draft' && run.offers.every(t=>t.id!==initial[0]+'-2')"));
 run("chooseExpedition(run.offers.find(t=>!t.needs.includes('edge')).id);chooseExpedition('remove');chooseExpedition('remove-edge')");
 assert.ok(run("run.panel==='draft' && run.offers.every(t=>t.id!=='edge')"));
 run("chooseExpedition(run.offers[0].id);chooseExpedition('buy');chooseExpedition(run.offers[0].id);chooseExpedition('buy')");
 assert.ok(run("run.panel==='shop' && run.coins===30 && run.shopBought"));
 run("const foe=enemies[0];foe.stagger=2;run.gifts={}");
 assert.equal(run("giftHit(foe,40,{weapon:spare})"),50);
 run("finishExpedition(false);startGame()");
 assert.ok(run("loadout.join()===initial.join() && !Object.keys(run.mods).length"));
});

test('contracts cost health or defense and expire on restart',()=>{
 const {run}=gameHarness(true);
 run("const base=maxHp;openAltar();chooseExpedition('pact-glass')");
 assert.ok(run("maxHp===base-35 && hp===maxHp && giftHit(enemies[0],50,{})===65"));
 run("openAltar();chooseExpedition('pact-glass')");
 assert.equal(run('maxHp'),run('base')-35);
 run("chooseExpedition('pact-clock');state='playing';skillCd=8;castGift('skill');const before=hp;damagePlayer(20)");
 assert.ok(run("skillCd===6 && hp===before-25"));
 run("finishExpedition(false);startGame()");
 assert.ok(run("!run.contracts.length && maxHp===base"));
});

test('charged rifle hits three distinct foes in impact order and stops at cover',()=>{
 for(const wall of [false,true]){
  const {run}=gameHarness(true);
  run("clearTransient();colliders.length=cameraMeshes.length=0;loadout=['rifle'];equipWeapon(player,'rifle');const targets=[2,3,4,5].map(z=>summon('hound',0,z));for(const t of targets)t.hp=t.maxHp=1000");
  run("chargeTime=.85;releaseHeavy();const bullet=projectiles[0];bullet.m.position.set(0,1.24,0);bullet.origin.copy(bullet.m.position);bullet.v.set(0,0,75)");
  if(wall)run("colliders.push({x:0,z:2.8,w:1,d:.1,h:3})");
  run("updateProjectiles(.022);updateProjectiles(.06)");
  assert.deepEqual(Array.from(run('targets.map(t=>t.hp)')),wall?[850,850,1000,1000]:[850,850,850,1000]);
  assert.equal(run('projectiles.length'),0);
 }
});

test('wet and armored enemies react to elements, split enemies produce only one generation',()=>{
 const {run}=gameHarness(true);
 run("const e=enemies[0];e.affixes=['armored','wet'];frostStack(e,1)");
 assert.ok(run("e.cold===2 && conductivity(e)===1.5 && giftHit(e,40,{})===30"));
 run("e.heat=1");assert.equal(run("giftHit(e,40,{})"),40);
 run("e.affixes=['split'];const before=enemies.length;damageEnemy(e,9999)");
 assert.equal(run("enemies.length"),run("before"));
 run("const other=enemies[1];other.affixes=['split'];damageEnemy(other,9999)");
 assert.ok(run("enemies.length===before+2 && enemies.slice(-2).every(child=>!child.affixes.length && child.hp===Math.ceil(other.maxHp*.25))"));
});

test('each tier adds four reachable studies per role, seeded rooms reproduce across restarts',()=>{
 const {run}=gameHarness(true);
 for(let tier=1;tier<=3;tier++){
  run("run.depth="+(tier-1)+";finishExpedition(true);$('rg-depth').value='"+tier+"';$('rg-seed').value='复航';startGame()");
  assert.equal(run('run.depth'),tier);
  assert.ok(run("enemies.every(e=>e.affixes.length===run.depth)"));
  assert.ok(run("Object.keys(expeditionRoles).every(hero=>{chosenClass=hero;const ids=new Set(roleBook().map(t=>t.id));return ids.size===expeditionRoles[hero].book.size+run.depth*4 && roleBook().every(t=>t.needs.every(id=>ids.has(id)));})"));
 }
 run("const snapshot=()=>JSON.stringify([run.deck,enemies.map(e=>[e.kind,e.affixes,e.cooldown]),giftOptions().map(t=>t.id)]);chosenClass='ember';startGame();const first=snapshot();giftOptions();startGame()");
 assert.equal(run('snapshot()'),run('first'));
});
