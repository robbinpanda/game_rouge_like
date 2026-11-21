import test from 'node:test';
import assert from 'node:assert/strict';
import {gameHarness} from './harness.mjs';

function claimRoomReward(run){
 if(!run('run.rewardNode!==null'))return;
 run("state='playing';player.group.position.copy(run.rewardNode.position);expeditionKey({code:'KeyF'})");
 if(run("run.panel==='hammer'"))run("chooseExpedition(hammerBook()[0].id)");
 while(run("run.panel==='draft'"))run("chooseExpedition(run.offers[0].id)");
 run("state='playing'");
}


test('altar bounty follows kill order, pays once on clear and expires in the next room',()=>{
 for(const first of [true,false]){
  const {run}=gameHarness(true);
  run("run.index=run.deck.findIndex(r=>r.type==='event');enterChamber();player.group.position.copy(exitPoint);useGate();chooseExpedition('bounty');state='playing'");
  assert.ok(run("run.bountyTarget.elite && currentTarget().name.startsWith('悬赏')"));
  if(!first)run('damageEnemy(enemies[0],9999)');
  run('damageEnemy(run.bountyTarget,9999)');
  assert.equal(run('run.coins'),0);
  run("for(let k=0;k<12&&run.status==='combat';k++){for(const e of [...enemies])damageEnemy(e,9999);stepEncounter(.02);}");
  assert.equal(run("run.coins-(roomNow().type==='elite'?32:18)"),first?48:20);
  claimRoomReward(run);
  run("player.group.position.copy(exitPoint);useGate();if(run.panel==='hammer')chooseExpedition(hammerBook()[0].id);while(run.panel==='draft')chooseExpedition(run.offers[0].id)");
  assert.equal(run('run.bountyTarget===null'),true);
 }
});
test('redraw replaces the offered talents, uses the chapter free roll first, then charges exact funds',()=>{
 const {run}=gameHarness(true);
 run("run.coins=16;run.shopDraft=true;openDraft();const before=run.offers;chooseExpedition('redraw')");
 assert.ok(run('!run.redraw && run.coins===16 && run.offers.every(t=>!before.includes(t))'));
 run("const second=run.offers;chooseExpedition('redraw')");
 assert.ok(run('run.coins===0 && run.offers.every(t=>!second.includes(t))'));
 run("const third=run.offers;chooseExpedition('redraw')");
 assert.ok(run('third===run.offers && run.coins===0'));
});
test('each enraged boss has a distinct third pattern with room to dodge between impacts',()=>{
 const {run}=gameHarness(true);
 for(const [act,kind,count] of [[0,'crab',3],[1,'ray',3],[2,'bloom',7]]){
  run(`clearMarks();run.act=${act};globalThis.boss=summon('${kind}',0,-3,{boss:true});boss.phaseShift=true;boss.attackIndex=2;pattern(boss)`);
  assert.equal(run('run.marks.length'),count);
  assert.ok(run('boss.attackHint && Math.max(...run.marks.map(m=>m.duration))-boss.windup>.5'));
  assert.equal(run("run.marks.filter(m=>m.kind==='disc').length"),act===2?7:0);
  assert.equal(run('new Set(run.marks.map(m=>m.duration)).size'),act===1?3:2);
  run('damageEnemy(boss,90);tickWarnings(.02)');
  assert.equal(run('run.marks.length'),0);
 }
});

test('one exit stays locked until the last enemy, then requires proximity and a reward choice',()=>{
 const {run}=gameHarness(true);
 run("player.group.position.copy(exitPoint);expeditionKey({code:'KeyF'})");
 assert.equal(run('state'),'playing');
 run("damageEnemy(enemies[0],9999);stepEncounter(.01)");
 assert.equal(run('currentTarget().exit'),false);
 assert.equal(run("currentTarget().name===enemies[1].name"),true);
 run("damageEnemy(enemies[1],9999);stepEncounter(.01);player.group.position.set(0,0,9);useGate()");
 assert.equal(run('run.status'),'reward');
 assert.equal(run('state'),'playing');
 run("player.group.position.copy(exitPoint);expeditionKey({code:'KeyF'})");
 assert.equal(run('run.panel'),'');
 run("player.group.position.copy(run.rewardNode.position);expeditionKey({code:'KeyF'})");
 assert.equal(run('run.panel'),'draft');
 assert.ok(run('run.offers.length>=1 && run.offers.length<=3 && run.offers.every(t=>giftPatron(t).id===run.draftPatron)'));
 run("chooseExpedition(run.offers[0].id)");
 assert.equal(run('run.index'),0);assert.equal(run('Object.keys(run.gifts).length'),1);
 run("state='playing';player.group.position.copy(exitPoint);useGate()");assert.equal(run('run.index'),1);
});
test('screen edge points behind the player and T faces the remaining objective',()=>{
 const {run}=gameHarness(true);
 run("enemies[0].dead=true;enemies[1].avatar.group.position.set(0,0,14);yaw=0;updateCamera(1)");
 assert.equal(run('markerPosition(currentTarget()).edge'),true);
 assert.ok(run('markerPosition(currentTarget()).y')>50);
 run("expeditionKey({code:'KeyT'})");
 assert.ok(Math.abs(Math.abs(run('yaw'))-Math.PI)<.01);
});
test('all three chapters, boss phases, stations, death and clean restart',()=>{
 const {run,storage}=gameHarness(true);
 for(let i=0;i<23;i++){
  assert.equal(run('run.act'),i<7?0:i<15?1:2);assert.equal(run('run.index'),i<7?i:i<15?i-7:i-15);
  run("state='playing';document.pointerLockElement=canvas");
  if(run('run.status')==='combat'){
   if(run("roomNow().type==='boss'")){
    run("enemies[0].hp=enemies[0].maxHp*.45;stepEncounter(.02)");
    assert.ok(run('enemies[0].phaseShift'));
    run("for(let j=0;j<17;j++)stepEncounter(.04)");
   }
   run("for(let k=0;k<12&&run.status==='combat';k++){for(const e of [...enemies])damageEnemy(e,9999);stepEncounter(.02);}");
  }
  claimRoomReward(run);
  run("player.group.position.copy(exitPoint);useGate()");
  if(i===22)break;
  if(run('run.panel')==='camp')run("chooseExpedition('visit-shop')");
  if(run('run.panel')==='event')run("chooseExpedition('offer')");
  if(run('run.panel')==='shop')run("chooseExpedition('buy')");
  if(run('run.panel')==='hammer')run("chooseExpedition(hammerBook()[0].id)");
  while(run('run.panel')==='draft')run('chooseExpedition(run.offers[0].id)');
  if(run('run.shopDraft===false && run.panel===\'shop\'').valueOf()){assert.equal(run('run.panel'),'shop');run("chooseExpedition('pass')");}
 }
 assert.equal(run('state'),'result');assert.deepEqual(JSON.parse(storage.get('aberrant-echo-record')),{best:23,wins:1,depth:1});
 run("startGame();state='playing';hp=1;damagePlayer(10)");
 assert.equal(run('state'),'result');assert.equal(run('Object.keys(run.gifts).length'),0);assert.equal(run('run.roomsCleared'),0);
});
test('dual-family prerequisite and steam burst apply in combat',()=>{
 const {run}=gameHarness(true);
 assert.equal(run("acquireGift('steam')"),false);run("acquireGift('brand');acquireGift('chill')");
 assert.equal(run("acquireGift('steam')"),true);
 run("enemies[0].hp=enemies[0].maxHp=1000;damageEnemy(enemies[0],10);tickGifts(.01)");
 assert.equal(run('enemies[0].hp'),945);
});
test('every room layout gives a walkable floor-arrow route from spawn to the sole gate',()=>{
 const {run}=gameHarness(true);
 const reached=run(`(()=>{
  for(let act=0;act<3;act++)for(let layout=0;layout<4;layout++){
   setChamber(act,layout);lightGate();
   let cell=run.paths.get('0,9');
   if(!cell)return false;
   while(cell.next){if(obstructed(cell,cell.next,0,.6))return false;cell=cell.next;}
   if(cell.x!==0||cell.z!==-13)return false;
  }
  return true;
 })()`);
 assert.ok(reached);
});

test('branching doors, dash-strike, death defiance, hammer aspect, shade and opening cinematic work cleanly',()=>{
 const {run}=gameHarness(true);
 // 1. Branching doors open on clear
 run("for(let k=0;k<12&&run.status==='combat';k++){for(const e of [...enemies])damageEnemy(e,9999);stepEncounter(.02);}");
 assert.equal(run('branchGates.length'),0);claimRoomReward(run);
 assert.equal(run('branchGates.length'),3);
 // 2. Dash-strike fires during dash window
 run("startGame();state='playing';time=10;dodge();dodgeTime=0;melee();");
 assert.equal(run('raid.strike.dashStrike'),true);
 // 3. Death Defiance revives at 50% HP instead of ending run
 run("meta.mirror.revive=1;startGame();state='playing';hp=10;damagePlayer(50);");
 assert.equal(run('state'),'playing');
 assert.equal(run('run.revives'),0);
 assert.ok(run('hp>=Math.round(maxHp*.5)-1'));
 // 4. Hammer transformation (katana-fan launches 3 wave projectiles on heavy strike)
 run("clearTransient();acquireGift('katana-fan');beginStrike(true);updateStrikes(1);");
 assert.equal(run('projectiles.length'),3);
 // 5. Shade is playable with 影印 resource
 run("chosenClass='shade';startGame();state='playing';run.power=5;useAbility();");
 assert.equal(run('run.power'),0);
 // 6. Opening cinematic runs smoothly through all stages to sanctuary menu
 run("startOpeningCinematic();assert_state=state;stepOpeningCinematic(1);cinematicTime=4;stepOpeningCinematic(.1);cinematicTime=9;stepOpeningCinematic(.1);");
 assert.equal(run('assert_state'),'cinematic');
 assert.equal(run('state'),'menu');
});
