import test from 'node:test';
import assert from 'node:assert/strict';
import {gameHarness} from './harness.mjs';

function arena(hero='ember'){
 const {run}=gameHarness(true);
 if(hero!=='ember')run(`chosenClass='${hero}';startGame();state='playing';time=10`);
 run("const a=enemies[0], b=enemies[1]; for(const e of enemies){e.hp=e.maxHp=1000;} a.avatar.group.position.copy(player.group.position); b.avatar.group.position.copy(player.group.position);b.avatar.group.position.x+=2;");
 return run;
}

test('tracking a three-school route leads from first prerequisites to the capstone through real drafts',()=>{
 const run=arena();
 run("openDraft();const original=run.offers;chooseExpedition('tree');chooseExpedition('track-stormVent');chooseExpedition('back')");
 assert.ok(run("run.panel==='draft' && run.offers===original && run.redraw===1"));
 assert.equal(run("acquireGift('stormVent')"),false);
 for(let i=0;i<5;i++){
  run("openDraft()");
  assert.ok(run("giftRoute('stormVent').includes(run.offers[0].id)"));
  run("chooseExpedition(run.offers[0].id)");
 }
 assert.ok(run("rank('stormVent')===1 && run.trackedGift===null"));
 run("startGame()");
 assert.ok(run("!rank('stormVent') && !run.trackedGift"));
});

test('ember dash can ignite and chill together',()=>{
 const run=arena();
 run("['cinder','iceStep','thermalStep'].forEach(acquireGift);dodge()");
 assert.equal(run('a.cold'),2);
 assert.ok(run('a.heat>0 && a.slow>0'));
 run('dodgeCd=0;dodge()');
 assert.ok(run('a.frozen>0'));
});
test('reaper can recover stamina once per window from targets slowed by its dash',()=>{
 const run=arena('reaper');
 run("['iceStep','tempo','glideEdge'].forEach(acquireGift);dodge();damageEnemy(a,10)");
 assert.equal(run('stamina'),86);
 assert.ok(run('Math.abs(dodgeCd-.23)<.001'));
 run('damageEnemy(b,10);time+=2;damageEnemy(b,10)');
 assert.equal(run('stamina'),94);
});

test('short circuit sets one expiring pin; its own and secondary damage cannot detonate it',()=>{
 const run=arena();
 run("['surge','tempo','arcPin'].forEach(acquireGift);stamina=50;castGift('utility');tickGifts(.01)");
 assert.equal(run('a.hp'),978);
 assert.ok(run('a.arcPinUntil>time'));
 run('damageEnemy(a,10);tickGifts(.01);damageEnemy(a,10);tickGifts(.01)');
 assert.equal(run('a.hp'),932);
 assert.equal(run('b.hp'),974);
 assert.equal(run('stamina'),60);
 run("castGift('skill');time+=4.1;damageEnemy(a,10);tickGifts(.01)");
 assert.equal(run('stamina'),60);
});

test('kiln guard heals and ignites the nearby pack only on a successful charged parry',()=>{
 const run=arena('bastion');
 run("['plate','flare','kilnGuard'].forEach(acquireGift);hp=50;parry();damagePlayer(10,a,true);tickGifts(.01)");
 assert.equal(run('hp'),58);
 assert.ok(run('b.hp===968 && b.heat>0'));
 run('damagePlayer(10,b,false)');
 assert.equal(run('hp'),48);
});

test('steam discharges into the nearest neighbor or back into an isolated boss, with the original steam cooldown',()=>{
 const run=arena();
 run("['brand','chill','steam','surge','stormVent'].forEach(acquireGift);damageEnemy(a,10);tickGifts(.01)");
 assert.equal(run('a.hp'),945);
 assert.equal(run('b.hp'),925);
 run('damageEnemy(a,10);tickGifts(.01)');
 assert.equal(run('b.hp'),925);
 run("b.avatar.group.position.x+=20;a.boss=true;time+=2.1;damageEnemy(a,10);tickGifts(.01)");
 assert.equal(run('a.hp'),850);
 assert.equal(run('b.hp'),925);
});

test('a burning heavy strike chills the pack, and the quench pulse cannot chain off echo damage',()=>{
 const run=arena();
 run("['brand','edge','hotEdge','chill','quench'].forEach(acquireGift);a.heat=3;damageEnemy(a,10,'player',null,{heavy:true});tickGifts(.01)");
 assert.equal(run('b.cold'),2);
 assert.ok(run('a.frozen>0 && b.hp===945'));
 run("damageEnemy(a,10,'player',null,{heavy:true});tickGifts(.01)");
 assert.equal(run('b.cold'),2);
 run("time+=2;damageEnemy(a,10,'player',null,{heavy:true});tickGifts(.01)");
 assert.ok(run('b.frozen>0 && !run.echoes.length'));
});

test('each role offers only its book, including every prerequisite, and rejects other signature gifts',()=>{
 for(const hero of ['ember','reaper','bastion']){
  const run=arena(hero);
  assert.ok(run('roleBook().every(t=>t.needs.every(id=>expeditionRoles[chosenClass].book.has(id)))'));
  assert.ok(run('Object.values(expeditionRoles).filter(r=>r!==expeditionRoles[chosenClass]).every(r=>r.signature.every(id=>!acquireGift(id)))'));
  run("run.roomsCleared=1;openDraft()");
  assert.ok(run('run.offers.some(signatureGift)'));
  run("chooseExpedition('tree');chooseExpedition('track-'+expeditionRoles[chosenClass].signature[2]);chooseExpedition('back')");
  for(let i=0;i<3;i++){run('openDraft();chooseExpedition(run.offers[0].id)');}
  assert.ok(run('expeditionRoles[chosenClass].signature.every(id=>rank(id))'));
 }
});
test('Ember spends saved heat at the dash endpoint and a full vent leaves a delayed second hit',()=>{
 const run=arena();
 run("['pilotLight','backdraft','afterburn'].forEach(acquireGift);useUtility();damageEnemy(a,1);a.heat=3;damageEnemy(a,1);damageEnemy(a,1)");
 assert.equal(run('run.power'),6);
 run("b.avatar.group.position.set(0,0,2);useAbility()");
 assert.equal(run('skillCd'),4);
 assert.ok(run("run.echoes.some(x=>x.enemy===b && x.amount===54) && run.echoes.some(x=>x.enemy===b && x.due>time && x.amount===40)"));
 assert.ok(run('run.power<6'));
});
test('Reaper marks a pack, consumes wounds on its pounce and chains to a fresh target on a kill',()=>{
 const run=arena('reaper');
 run("['serrated','bloodMeal','packHunt'].forEach(acquireGift);a.avatar.group.position.z-=4;b.avatar.group.position.z-=7;useUtility()");
 assert.ok(run('a.wounds===2 && b.wounds===2'));
 run("hp=70;damageEnemy(a,1,'player',null,{heavy:true});a.hp=90;useAbility()");
 assert.ok(run('a.dead && a.wounds===0 && b.wounds===5 && skillCd===0 && hp===87'));
 run("b.hp=1000;useAbility()");
 assert.ok(run('b.hp===888 && b.wounds===0 && skillCd>0'));
 run("buffTime=0;burst();damageEnemy(b,1)");
 assert.ok(run('b.wounds>=2'));
});
test('Bastion stores only shielded hits or counters, cashes out at the cap and can rebuild with Q',()=>{
 const run=arena('bastion');
 run("['bedrock','fault','mountain'].forEach(acquireGift);hp=100;damagePlayer(10,a);invulnerable=0");
 assert.equal(run('run.power'),0);
 run("useAbility();damagePlayer(10,a);damagePlayer(10,b)");
 assert.equal(run('run.power'),2);
 run("invulnerable=0;parry();damagePlayer(10,b,true);ultimateCd=10");
 assert.equal(run('run.power'),4);
 const hpBefore=run('hp');
 run("useUtility();tickGifts(.01)");
 assert.ok(run("run.power===0 && a.hp===932 && skillCd===6 && ultimateCd===4"));
 assert.equal(run('hp'),hpBefore+16);
 run('ultimateCd=0;burst()');
 assert.equal(run('run.power'),2);
});
