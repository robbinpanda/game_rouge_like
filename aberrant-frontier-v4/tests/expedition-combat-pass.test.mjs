import test from 'node:test';
import assert from 'node:assert/strict';
import {gameHarness} from './harness.mjs';

test('a crab can only hit the warned sector and its second move warns a different footprint',()=>{
 const {run}=gameHarness(true);
 run(`clearTransient();colliders.length=cameraMeshes.length=0;
  const crab=summon('crab',0,0);
  player.group.position.set(0,0,3);pattern(crab);
  const mark=run.marks[0],health=hp;`);
 assert.equal(run('mark.kind'),'sector');
 assert.ok(run('hitFootprint(mark,player.group.position)'));
 run('player.group.position.z=-3;tickWarnings(.8)');
 assert.equal(run('hp'),run('health'));
 assert.equal(run('groundFlashes.length'),1);
 run('pattern(crab)');
 assert.ok(run("run.marks[0].kind==='disc' && run.marks[0].charged"));
});

test('a heavy hit cannot skip the boss transition and phase two starts with its signature',()=>{
 const {run}=gameHarness(true);
 run(`clearTransient();colliders.length=cameraMeshes.length=0;
  const foe=summon('crab',0,0,{boss:true});player.group.position.set(0,0,5);
  damageEnemy(foe,9999);stepEncounter(.01);`);
 assert.ok(run('!foe.dead && foe.hp===foe.maxHp*.5 && foe.transition>0'));
 run('damageEnemy(foe,9999);stepEncounter(.66);stepEncounter(.14)');
 assert.ok(run("foe.hp===foe.maxHp*.5 && foe.attackIndex===3 && run.marks.length===3 && foe.attackHint.includes('夹轨')"));
});

test('terrain hazards give warning, hit enemies and can be jumped over',()=>{
 const {run}=gameHarness(true);
 run(`clearTransient();colliders.length=cameraMeshes.length=0;
  addTrap('line',0,0,1,7);
  const foe=summon('hound',0,0);player.group.position.set(0,1.1,1);const health=hp;
  stepTerrain(4.5);`);
 assert.ok(run('roomTraps[0].mark && foe.hp===foe.maxHp && hp===health'));
 run('stepTerrain(.85)');
 assert.ok(run('hp===health && foe.hp===foe.maxHp-22 && !roomTraps[0].mark'));
 run('player.group.position.y=0;stepTerrain(6.4)');
 assert.equal(run('hp'),run('health-12'));
});

test('Ember paints a fire line while Frost traps once and launches a charged ice projectile',()=>{
 const {run}=gameHarness(true);
 run(`clearTransient();colliders.length=cameraMeshes.length=0;
  player.group.position.set(0,0,0);yaw=0;useUtility();
  const fire=raid.zones[0],foe=summon('hound',-2,fire.pos.z);
  const outside=summon('hound',-2,fire.pos.z+2);
  updateRaid(.3);`);
 assert.ok(run("fire.footprint.kind==='line' && foe.burn>0 && outside.burn===0"));
 run(`clearTransient();chosenClass='frost';raid.utilityCd=0;useUtility();
  const trap=raid.zones[0],caught=summon('hound',0,trap.pos.z);
  updateRaid(.3);const frozen=caught.frozen;caught.frozen=0;updateRaid(.83);`);
 assert.ok(run("trap.footprint.kind==='disc' && frozen>0 && caught.frozen===0 && caught.slow>0"));
 run("run.power=4;run.gifts={fracture:1};useAbility();const shot=projectiles.at(-1)");
 assert.ok(run('run.power===0 && shot.frostBurst && shot.pierceLimit===2'));
 run("burst();const waveHp=caught.hp;stepElementalWaves(.05);const early=caught.hp;stepElementalWaves(.3);");
 assert.ok(run('early===waveHp && caught.hp<waveHp'));
});
