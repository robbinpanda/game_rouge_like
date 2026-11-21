import assert from 'node:assert/strict';
import test from 'node:test';
import {gameHarness} from './harness.mjs';

test('landing on a low cover or stopping at a crate never pushes the actor across its footprint',()=>{
 const {run}=gameHarness(true);
 run('colliders.length=0;surfaces.length=0;cover(0,0,4,3.25,3,0);player.group.position.set(0,1.84,3);move(player.group,0,-5)');
 assert.equal(run('player.group.position.z'),2);
 run('player.group.position.set(0,3.25,0);move(player.group,0,0);move(player.group,.04,0)');
 assert.deepEqual(Array.from(run('player.group.position.toArray()')),[.04,3.25,0]);
 run('player.group.position.set(0,.82,0);colliders[0].h=.82;move(player.group,0,.05)');
 assert.equal(run('player.group.position.z'),.05);
});

test('each patron keeps its identity through redraws and the cleared room opens doors only after claim',()=>{
 const {run}=gameHarness(true);
 for(const id of ['ember','frost','shade','bastion','reaper']){
  run(`startGame();state='playing';roomNow().patron='${id}';for(const e of enemies)damageEnemy(e,99999);stepEncounter(.02)`);
  assert.equal(run('run.status'),'reward');
  run("player.group.position.copy(exitPoint);expeditionKey({code:'KeyF'})");
  assert.equal(run('branchGates.length'),0);
  run("player.group.position.copy(run.rewardNode.position);expeditionKey({code:'KeyF'})");
  for(const action of ['tree','back','redraw']){
   run('chooseExpedition('+JSON.stringify(action)+')');
   assert.ok(run(`run.offers.length>0&&run.offers.every(t=>!t.weapon&&giftPatron(t).id==='${id}')`));
  }
  run('chooseExpedition(run.offers[0].id)');
  assert.ok(run("run.index===0&&run.rewardNode===null&&run.status==='exit'&&branchGates.length>0"));
 }
});

test('all three air patterns telegraph, travel slowly, clear on room change and stop at cover',()=>{
 const {run}=gameHarness(true);
 for(const [act,id] of ['signalBloom','buoyRay','irisRay'].entries()){
  run(`clearTransient();colliders.length=0;cameraMeshes.length=0;run.act=${act};player.group.position.set(0,0,8);
   globalThis.foe=summon(actVariants['${id}'].kind,0,0,{variant:'${id}'});pattern(foe)`);
  assert.ok(run("run.marks.length>=4&&run.marks.every(m=>m.kind==='drift')&&projectiles.length===0"));
  run('tickWarnings(2)');
  assert.ok(run('projectiles.length>=4 && projectiles.every(p=>p.halo&&p.v.length()<4)'));
  run('globalThis.sample=projectiles[0];sample.m.position.set(0,1.35,0);sample.v.set(0,0,3);solid(0,.2,1,.1,3);updateProjectiles(.12)');
  assert.ok(run('!projectiles.includes(sample)&&!sample.halo.parent'));
  run('enterChamber()');assert.equal(run('projectiles.length+run.marks.length'),0);
 }
});

test('camera diagnostic separates room transitions from abrupt movement during an attack',()=>{
 const {run,storage}=gameHarness(true);
 run("sampleExpeditionCamera(.016);mouseDown=true;camera.position.x+=3;sampleExpeditionCamera(.016)");
 const [event]=JSON.parse(storage.get('aberrant-echo-camera-v1'));
 assert.equal(event.attack,true);assert.ok(Math.abs(event.distance-3)<1e-8);
 run('enterChamber();sampleExpeditionCamera(.016)');
 assert.equal(JSON.parse(storage.get('aberrant-echo-camera-v1')).length,1);
});

test('long camera updates converge to the combat FOV without overshoot',()=>{
 const {run}=gameHarness(true);
 run('camera.fov=80;for(let i=0;i<12;i++)updateCamera(.4)');
 assert.ok(run('Math.abs(camera.fov-59)<.01 && camera.projectionMatrix.elements.every(Number.isFinite)'));
});
