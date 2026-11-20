import test from 'node:test';
import assert from 'node:assert/strict';
import {gameHarness} from './harness.mjs';

test('each equipped weapon owns two independently upgradeable basic attacks',()=>{
 const {run}=gameHarness(true);
 for(const id of ['katana','spear','dual','hammer','crossbow','rifle']){
  run(`loadout=['${id}'];equipWeapon(player,loadout[0]);run.gifts={};`);
  for(const side of ['left','right']){
   const right=side==='right';
   const cast=()=>run(`clearProjectiles();raid.strike=null;meleeCd=0;mouseRight=${right};
    ${right?'alternateAttack()':'melee()'};updateStrikes(1);
    JSON.stringify([projectiles.length,projectiles[0]?.life,projectiles[0]?.pierceLimit,projectiles[0]?.knockback,
     formReach(loadout[0],${right}),formPush(loadout[0],${right})]);`);
   const before=cast();
   run(`acquireGift('${id}-${side}');acquireGift('${id}-${side}')`);
   assert.equal(run(`attackRank('${id}',${right})`),2);
   assert.notEqual(cast(),before,id+'/'+side);
   if(!right)assert.equal(run(`attackRank('${id}',true)`),0);
  }
 }
 assert.ok(run("switchWeapon(1);activeWeapon===0 && loadout.length===1"));
});
test('draws and visual effects reproduce per room regardless of tab and audio activity',()=>{
 const {run}=gameHarness(true);
 run(`$('rg-seed').value='渡口';startGame();openDraft();chooseExpedition('study-weapon');
 const first=run.offers.map(x=>x.id).join();const phase=visualRoll();
 startGame();openDraft();chooseExpedition('study-common');chooseExpedition('study-skill');
 for(let i=0;i<100;i++){run.random();noiseRoll();}chooseExpedition('study-weapon');`);
 assert.equal(run('run.offers.map(x=>x.id).join()'),run('first'));
 assert.equal(run('visualRoll()'),run('phase'));
});
test('reticle heading stays in front while backing up or looking at near camera cover',()=>{
 const {run}=gameHarness(true);
 run(`input.KeyS=true;const startYaw=yaw;loadout=['crossbow'];equipWeapon(player,'crossbow');
 for(let i=0;i<120;i++){updatePlayer(1/60);updateCamera(1/60);}
 const forward=aimFacing(aimSolution().point);
 const behind=aimFacing(player.group.position.clone().add(new THREE.Vector3(0,0,1)));
 fireForm(false);`);
 assert.equal(run('yaw'),run('startYaw'));
 assert.ok(run('forward.dot(new THREE.Vector3(Math.sin(player.group.rotation.y),0,Math.cos(player.group.rotation.y)))>.999'));
 assert.ok(run('behind.z<0 && projectiles.at(-1).v.z<0'));
});
test('volumetric skill meshes change with skill study ranks and recycle between rooms',()=>{
 const {run}=gameHarness(true);
 for(const hero of ['ember','reaper','bastion']){
  run(`chosenClass='${hero}';run.gifts={};showSkillCast('skill');`);
  assert.equal(run('battleEffects.at(-1).object.material.uniforms.level.value'),0);
  run('battleEffects.at(-1).object.geometry.computeBoundingBox()');
  assert.ok(run('battleEffects.at(-1).object.geometry.boundingBox.getSize(new THREE.Vector3()).toArray().every(n=>n>1)'));
  run("acquireGift(expeditionRoles[chosenClass].signature[0]);showSkillCast('skill')");
  assert.equal(run('battleEffects.at(-1).object.material.uniforms.level.value'),1);
  run('clearTransient()');assert.equal(run('battleEffects.length'),0);
 }
});
