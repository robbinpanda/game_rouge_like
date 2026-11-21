import test from 'node:test';
import assert from 'node:assert/strict';
import {gameHarness} from './harness.mjs';

test('three body rigs keep both hands on each weapon through wind-up, contact and recovery',()=>{
 const {run}=gameHarness(true);
 const errors=run(`(()=>{
  const errors=[];
  for(const hero of Object.keys(expeditionRoles)){
   const a=createMutant(hero,true);
   for(const id of Object.keys(WEAPONS)){
    equipWeapon(a,id);
    if(a.weaponGroup.parent!==a.grips[1]||(id==='dual')!==(a.secondBlade?.parent===a.grips[0]))errors.push(hero+'/'+id+' mount');
    for(const elapsed of [0,.13,.3,.72]){
     animateMutant(a,.016,false);poseWeapon(a,{id,windup:.3,duration:.8,elapsed,step:1});
     if(supportSocket[id]){
      const target=a.weaponGroup.localToWorld(new THREE.Vector3(...supportSocket[id]));
      const gap=target.distanceTo(a.grips[0].getWorldPosition(new THREE.Vector3()));
      if(gap>.075)errors.push(hero+'/'+id+'/'+elapsed+'/'+gap.toFixed(3));
     }
    }
   }
  }
  return errors;
 })`);
 assert.deepEqual(Array.from(errors),[]);
});

test('equipped weapon paths require both general and role talents, draft tabs retain their offers',()=>{
 const {run}=gameHarness(true);
 assert.ok(run(`Object.keys(expeditionRoles).every(hero=>{
  chosenClass=hero;
  return Object.keys(WEAPONS).every(id=>{
   loadout=[id];run.gifts={};
   return !acquireGift(id+'-3')&&acquireGift(id+'-1')&&!acquireGift(id+'-2')&&acquireGift('edge')&&acquireGift(id+'-2')&&!acquireGift(id+'-3')&&acquireGift(expeditionRoles[hero].signature[0])&&acquireGift(id+'-3');
  });
 })`));
 run("run.gifts={};run.coins=40;openStation();chooseExpedition('buy');chooseExpedition('study-weapon');const offers=run.offers;chooseExpedition('study-common');chooseExpedition('study-weapon')");
 assert.ok(run('offers===run.offers&&offers.every(t=>loadout.includes(t.weapon))&&run.redraw===1'));
});
test('a projectile keeps its weapon at launch and only a weapon hit consumes its skill resonance',()=>{
 const {run}=gameHarness(true);
 run(`loadout=['rifle'];activeWeapon=0;equipWeapon(player,'rifle');run.gifts={'rifle-1':1,'rifle-2':1,'rifle-3':1};castGift('skill');shoot();const shot=projectiles.at(-1);switchWeapon(1);const e=enemies[0];e.slow=0;stamina=20;`);
 assert.ok(run("shot.weapon==='rifle'&&run.armedStudy==='rifle'"));
 run("giftHit(e,12,{echo:true,weapon:'rifle'});giftHit(e,12,{weapon:'hammer'})");
 assert.equal(run('run.armedStudy'),'rifle');
 assert.equal(run("giftHit(e,12,{weapon:shot.weapon,distance:10})"),36);
 assert.ok(run('run.armedStudy===null&&e.slow===2&&stamina===29&&run.echoes.some(hit=>hit.amount===55)'));
});
