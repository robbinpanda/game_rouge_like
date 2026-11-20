import test from 'node:test';
import assert from 'node:assert/strict';
import {gameHarness} from './harness.mjs';

function encounter(kind){
 const {run}=gameHarness(true);
 run(`enemies.length=0;colliders.length=0;cameraMeshes.length=0;
  const foe=summon('${kind}',0,0);foe.avatar.group.position.set(0,0,0);
  player.group.position.set(0,0,7);invulnerable=0;foe.cooldown=0;`);
 return run;
}

test('locked laser gives time to sidestep, stops at cover and can be parried',()=>{
 for(const outcome of ['hit','sidestep','cover','parry']){
  const run=encounter('ray');
  if(outcome==='cover')run('solid(0,10,3,1,4)');
  run('stepEncounter(.01);const beam=run.marks[0],before=hp;stepEncounter(1)');
  assert.equal(run('beam.kind'),'laser');
  assert.equal(run('hp'),run('before'));
  if(outcome==='sidestep')run('player.group.position.x=2');
  if(outcome==='cover'){
   assert.equal(run('beam.to.z'),9.5);
   run('player.group.position.z=12');
  }
  if(outcome==='parry')run('parry()');
  run('stepEncounter(.06);stepEncounter(.01)');
  assert.equal(run('before-hp'),outcome==='hit'?18:0);
  assert.equal(run('raid.parries'),outcome==='parry'?1:0);
  assert.equal(run('run.marks.length'),0);
 }
});

test('crystal volleys travel through their warned gaps in two staggered waves',()=>{
 const run=encounter('bloom');
 run('stepEncounter(.01);const before=hp;stepEncounter(.85)');
 assert.equal(run('projectiles.length'),0);
 run('stepEncounter(.02);const first=projectiles[0].v.clone().normalize()');
 assert.equal(run('projectiles.length'),8);
 assert.equal(run('hp'),run('before'));
 run('stepEncounter(.62)');
 assert.equal(run('projectiles.length'),16);
 assert.ok(run('Math.abs(first.angleTo(projectiles[8].v)-Math.PI/8)<1e-6'));
 run('for(let i=0;i<26;i++)updateProjectiles(.04)');
 assert.equal(run('before-hp'),10);
 run('enterChamber()');
 assert.equal(run('projectiles.length+run.marks.length'),0);
});

test('interrupting a bloom after wave one cancels wave two',()=>{
 const run=encounter('bloom');
 run("stepEncounter(.01);stepEncounter(.9);damageEnemy(foe,1,'player',null,{heavy:true});stepEncounter(.7)");
 assert.equal(run('projectiles.length'),8);
 assert.equal(run('run.marks.length'),0);
});
