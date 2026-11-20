import test from 'node:test';
import assert from 'node:assert/strict';
import {gameHarness} from './harness.mjs';

test('all twelve real input paths select their own silhouette and two visible upgrade bands',()=>{
 const {run}=gameHarness(true);
 const shapes=new Set();
 run("const seen=new Set();");
 for(const id of ['katana','spear','dual','hammer','crossbow','rifle']){
  for(const right of [false,true]){
   for(let level=0;level<=2;level++){
    const key=id+'-'+(right?'right':'left');
    run(`loadout=['${id}'];equipWeapon(player,'${id}');run.gifts={'${key}':${level}};
     advanceBattleEffects(Infinity);clearProjectiles();meleeCd=0;raid.strike=null;mouseRight=${right};state='playing';
     ${right?'alternateAttack()':'melee()'};updateStrikes(1);`);
    const model=run("battleEffects.map(f=>f.object).find(m=>/^(muzzle|swing)\\//.test(m.name))");
    assert.ok(model,id);assert.equal(model.material.uniforms.level.value,level);
    const tiers=model.geometry.getAttribute('tier').array;
    assert.ok(tiers.includes(0)&&tiers.includes(1)&&tiers.includes(2));
    assert.equal(model.castShadow,false);shapes.add(model.geometry);
    if(run('projectiles.length')){
     assert.ok(run(`projectiles.every(p=>p.form.id==='${id}'&&p.form.level===${level}&&p.form.right===${right}&&p.m.geometry===p.form.geometry)`));
     assert.ok(run('projectiles[0].form.geometry.getAttribute("tier").array.every(x=>x<=projectiles[0].form.level)'));
    }
   }
  }
 }
 assert.equal(shapes.size,12);
 run("clearTransient()");assert.equal(run('battleEffects.length+projectiles.length'),0);
});
test('equal-rank spell studies show different volumes at the caster and target; delayed phoenix follows both hits',()=>{
 const {run}=gameHarness(true);
 run("const foe=enemies[0];foe.avatar.group.position.copy(player.group.position).add(new THREE.Vector3(2,0,0));run.gifts={flare:1,rime:1,surge:1};castGift('utility')");
 for(const id of ['flare','rime','surge'])assert.ok(run(`battleEffects.some(f=>f.object.name==='gift/${id}')`));
 assert.ok(run("battleEffects.find(f=>f.object.name==='gift/flare').object.position.equals(player.group.position)"));
 assert.ok(run("battleEffects.some(f=>f.object.name==='gift/rime'&&f.object.position.equals(foe.avatar.group.position))"));
 run("run.gifts={afterburn:1};ventBlade(5)");
 assert.equal(run("battleEffects.filter(f=>f.object.name==='gift/afterburn').length"),0);
 run("ventBlade(6);const phoenix=battleEffects.filter(f=>f.object.name==='gift/afterburn');advanceBattleEffects(.41)");
 assert.ok(run("phoenix.length===2&&phoenix[0].object.visible&&!phoenix[1].object.visible"));
 run("advanceBattleEffects(.32)");assert.ok(run("phoenix[1].object.visible"));
});
test('rare and legendary studies have weighted offers, readable grades and reversible bonuses',()=>{
 const {run}=gameHarness(true);
 run("const initial=maxHp;acquireGift('brand');acquireGift('chill');acquireGift('steam')");
 assert.equal(run('maxHp'),run('initial')+8);
 run("acquireGift('surge');acquireGift('stormVent');showTree();chooseExpedition('tab-all')");
 assert.ok(run("giftRarity(giftById.stormVent)==='legendary'&&maxHp===initial+26&&$('rg-panel').innerHTML.includes('传说 · 蒸雷涌')"));
 run("hp=maxHp;removeGift('stormVent');removeGift('steam')");
 assert.ok(run('hp===initial&&maxHp===initial'));
 const counts=run(`[false,true].map(elite=>{const roll=seededRoll('weight');let count=0;
  for(let i=0;i<3000;i++)if(weightedGifts([giftById.brand,giftById.stormVent],elite,roll)[0].id==='stormVent')count++;
  return count;})`);
 assert.ok(counts[0]>180&&counts[0]<480&&counts[1]>counts[0]);
});
