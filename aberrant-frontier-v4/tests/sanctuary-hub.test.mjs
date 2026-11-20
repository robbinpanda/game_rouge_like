import test from 'node:test';
import assert from 'node:assert/strict';
import {gameHarness} from './harness.mjs';

test('all humanoid heroes use sculpted rigged models with distinct materials and clean back regalia',()=>{
 const {run}=gameHarness(true);
 const check=run(`(()=>{
  const mats=new Set();
  const issues=[];
  for(const hero of ['ember','frost','shade','bastion']){
   const a=createMutant(hero,true);
   if(!a.body||!a.skeleton)issues.push(hero+' missing sculpted rig');
   if(mats.has(a.body.material))issues.push(hero+' shares material instance');
   mats.add(a.body.material);
   if(!a.regalia)issues.push(hero+' missing regalia anchor');
   if(a.regalia.position.y<1.9)issues.push(hero+' regalia anchored too low');
   releasePlayer(a);
  }
  return issues;
 })()`);
 assert.deepEqual(Array.from(check),[]);
});

test('Hades-style walkable Sanctuary Hub supports roaming, 3D companions, Skelly dummy combat, and archway launch',()=>{
 const {run}=gameHarness(true);
 // 1. Return to Sanctuary, build props & verify 4 standing 3D companion NPCs (never duplicating current hero)
 run('returnMenu();buildSanctuaryHubProps();refreshSanctuaryCompanions();setSanctuaryRoamMode(true);');
 assert.equal(run('sanctuaryHub.npcs.length'),4);
 assert.equal(run('sanctuaryHub.npcs.some(n=>n.id===chosenClass)'),false);
 assert.equal(run('isSanctuaryRoam()'),true);

 // 2. Walk forward with WASD inside Sanctuary terrace and verify clamping at cliff edge
 run('player.group.position.set(0,0,22);input.KeyW=true;for(let i=0;i<20;i++)updateSanctuaryHub(.03);input.KeyW=false;');
 assert.ok(run('player.group.position.z < 19 && player.group.position.z >= 13.6'));

 // 3. Dash + Dash-Strike against Skelly training dummy logs damage, combo & recoil
 run('player.group.position.set(3.4,0,17.5);sanctuaryDash();sanctuaryAttack("melee");updateSanctuaryHub(.03);');
 assert.ok(run('sanctuaryHub.dummyCombo >= 1'));
 assert.ok(run('sanctuaryHub.dpsLog.length >= 1'));
 assert.ok(run('sanctuaryHub.dummy.wobble > 0'));

 // 4. Walking up to Grand Archway and pressing F triggers expedition launch
 run('player.group.position.set(0,0,14.6);updateSanctuaryHub(.03);');
 assert.equal(run('sanctuaryHub.nearest?.kind'),'depart');
 assert.equal(run('triggerSanctuaryInteract()'),true);
 assert.equal(run('sanctuaryHub.roam'),false);
});
